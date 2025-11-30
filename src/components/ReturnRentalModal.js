// File: src/components/ReturnRentalModal.js

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { generateInvoicePDF } from '../utils/InvoiceGenerator'; 
import { generateReturnAgreementPDF } from '../utils/ReturnAgreementGenerator'; 
import { dataURLtoFile } from '../utils/pdfHelper'; 
import { v4 as uuidv4 } from 'uuid';
import SignatureCanvas from 'react-signature-canvas'; 
import './ReturnRentalModal.css'; 

const ReturnRentalModal = ({ rental, car, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const sigPad = useRef(null);
  
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const defaultDateTime = now.toISOString().slice(0, 16);

  const [returnDateTime, setReturnDateTime] = useState(defaultDateTime);
  const [endMileage, setEndMileage] = useState('');
  const [damageCost, setDamageCost] = useState(0);
  const [remarks, setRemarks] = useState('');

  const [calculations, setCalculations] = useState({
    extraKm: 0, extraKmCost: 0, lateHours: 0, lateFeeCost: 0, totalDue: 0
  });

  // --- Helper: Format Date for Display ---
  const getFormattedDateParts = (isoString) => {
    const d = new Date(isoString);
    return {
      year: String(d.getFullYear()).slice(-2), 
      month: d.getMonth() + 1,
      day: d.getDate(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const dateParts = getFormattedDateParts(returnDateTime);

  // --- Helper: Force Keyboard Close on Mobile ---
  const dismissKeyboard = () => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur(); // Closes the number pad/keyboard
    }
  };

  // --- 1. Calculations ---
  useEffect(() => {
    if (!rental || !car) return;

    const startMil = parseFloat(rental.start_mileage) || 0;
    const endMil = parseFloat(endMileage) || startMil;
    const driven = endMil - startMil;
    const allowedKm = (rental.rental_days * (car.km_limit_per_day || 100)); 
    
    let extraKm = 0;
    if (driven > allowedKm) extraKm = driven - allowedKm;
    const extraKmCost = extraKm * (car.extra_km_price || 0);

    const startDate = new Date(rental.rental_start_date);
    const expectedReturnDate = new Date(startDate);
    expectedReturnDate.setDate(startDate.getDate() + rental.rental_days);
    
    const actualReturnDate = new Date(returnDateTime);
    let lateHours = 0;
    const diffMs = actualReturnDate - expectedReturnDate;
    if (diffMs > 0) lateHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const lateFeeCost = lateHours * (car.late_fee_per_hour || car.extra_hourly_rate || 0);

    const baseCost = rental.rental_days * (car.daily_rate || 0);
    const subTotal = baseCost + extraKmCost + lateFeeCost + parseFloat(damageCost);
    const finalDue = subTotal - (rental.advance_payment || 0);

    setCalculations({ extraKm, extraKmCost, lateHours, lateFeeCost, totalDue: finalDue });
  }, [endMileage, returnDateTime, damageCost, rental, car]);


  // --- 2. Handle Submit ---
  const handleConfirmReturn = async () => {
    if (!endMileage) return alert("Please enter ending mileage");
    if (sigPad.current.isEmpty()) return alert("Customer signature is required to return.");
    
    setLoading(true);
    setStatusMsg('Starting Return... 🚀'); 

    try {
      // A. Upload Signature (To 'photos' bucket)
      setStatusMsg('Saving Signature... ✍️');
      const sigDataUrl = sigPad.current.toDataURL('image/png');
      const sigFile = dataURLtoFile(sigDataUrl, `return-sig-${rental.id}.png`);
      const sigFileName = `signatures/${uuidv4()}-return-sig.png`; 
      
      const { error: sigError } = await supabase.storage
        .from('photos') 
        .upload(sigFileName, sigFile);
      
      if (sigError) throw sigError;
      const { data: sigUrlData } = supabase.storage.from('photos').getPublicUrl(sigFileName);
      const signaturePublicUrl = sigUrlData.publicUrl;

      // Common Return Data
      const returnData = {
        returnDate: returnDateTime,
        endMileage,
        extraKm: calculations.extraKm,
        lateHours: calculations.lateHours,
        damageCost: parseFloat(damageCost),
        finalTotal: calculations.totalDue,
        signatureUrl: sigDataUrl 
      };

      // B. Generate & Upload Invoice
      setStatusMsg('Generating Invoice... 🧾');
      const invoiceFile = await generateInvoicePDF(rental, car, returnData);
      const invFileName = `invoices/invoice-${rental.id}-${uuidv4()}.pdf`; 
      
      await supabase.storage.from('photos').upload(invFileName, invoiceFile); 
      const { data: invUrlData } = supabase.storage.from('photos').getPublicUrl(invFileName);

      // C. Generate & Upload Return Agreement
      setStatusMsg('Generating Return Doc... 📄');
      const returnDocFile = await generateReturnAgreementPDF(rental, car, returnData);
      const returnDocName = `agreements/return-doc-${rental.id}-${uuidv4()}.pdf`; 
      
      await supabase.storage.from('photos').upload(returnDocName, returnDocFile); 
      const { data: returnDocData } = supabase.storage.from('photos').getPublicUrl(returnDocName);

      // D. Update Database
      setStatusMsg('Updating Database... 💾');
      const { error: rentalUpdateError } = await supabase
        .from('rentals')
        .update({
          status: 'completed',
          return_date: returnDateTime,
          end_mileage: endMileage,
          final_total_cost: calculations.totalDue,
          extra_mileage_cost: calculations.extraKmCost,
          return_invoice_pdf_url: invUrlData.publicUrl,
          return_agreement_pdf_url: returnDocData.publicUrl, 
          return_signature_url: signaturePublicUrl, 
          remarks_return: remarks
        })
        .eq('id', rental.id);

      if (rentalUpdateError) throw rentalUpdateError;

      // E. Update Car Status
      await supabase.from('vehicles').update({ status: 'Available', current_mileage: endMileage }).eq('id', car.id);

      // F. Send SMS
      setStatusMsg('Sending SMS... 📲');
      try {
        await supabase.functions.invoke('send-local-sms', {
          body: { 
            customerPhone: rental.customer_phone, 
            customerName: rental.customer_name,
            link: invUrlData.publicUrl, 
            type: 'return' 
          }
        });
      } catch (smsError) { console.warn("SMS Failed", smsError); }

      setStatusMsg('Done! ✅');
      onSuccess();

    } catch (error) {
      console.error("Error returning vehicle:", error);
      alert("Error: " + error.message);
      setStatusMsg('');
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => sigPad.current.clear();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Return: {car.name}</h2>
          <a 
            href={rental.agreement_pdf_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{fontSize: '0.9rem', color: '#007bff', textDecoration: 'none', fontWeight: '600'}}
          >
            📄 View Original
          </a>
        </div>
        
        <div className="form-group">
          <label>Return Date & Time</label>
          <input type="datetime-local" value={returnDateTime} onChange={(e) => setReturnDateTime(e.target.value)} />
        </div>

        <div className="form-group">
          <label>End Mileage (Start: {rental.start_mileage})</label>
          <input type="number" value={endMileage} onChange={(e) => setEndMileage(e.target.value)} placeholder="Enter current km" />
        </div>

        <div className="form-group">
          <label>Damages / Repair Cost (LKR)</label>
          <input type="number" value={damageCost} onChange={(e) => setDamageCost(e.target.value)} />
        </div>

        <div className="form-group">
          <label>Remarks</label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>

        {/* Declaration Text */}
        <div className="declaration-text" style={{fontFamily: '"Iskoola Pota", "Noto Sans Sinhala", sans-serif', fontSize: '0.85rem', lineHeight: '1.6'}}>
          <strong>ප්‍රකාශය:</strong> <br/>
          {rental.customer_address} හි පදිංචි <strong>{rental.customer_name}</strong> (ජා.හැ.අංක. {rental.customer_id}) වන මා විසින් 
          මාතර යාළුවෝ ටුවර්ස් ඇන්ඩ් රෙන්ට් අ කාර් ආයතනයෙන් අංක <strong>{car.plate_number}</strong> දරණ <strong>{car.name}</strong> වර්ගයේ වාහනය 
          ඉහත සඳහන් ගිවිසුම හා කොන්දේසි වලට යටත්ව 20<strong>{dateParts.year}</strong> ක්වූ <strong>{dateParts.month}</strong> මස <strong>{dateParts.day}</strong> දින <strong>{dateParts.time}</strong> ට 
          වාහනය භාරදුන් බවට මෙයින් සහතික කරමි.
        </div>

        {/* Signature */}
        <div className="signature-section">
          <label>Customer Return Signature</label>
          <div 
            className="signature-box" 
            style={{touchAction: 'none'}} // 1. CSS fix for scrolling
          >
            <SignatureCanvas 
              ref={sigPad} 
              penColor='black' 
              clearOnResize={false} // 2. JS fix for resize/keyboard clear
              onBegin={dismissKeyboard} // 3. Logic fix for focus jumping
              canvasProps={{ className: 'sig-canvas' }} 
            />
          </div>
          <button type="button" onClick={clearSignature} style={{marginTop: '5px', fontSize: '0.8rem', padding: '5px 10px', background: '#f8f9fa', border: '1px solid #ccc', borderRadius: '4px'}}>
            Clear
          </button>
        </div>

        <div className="summary-box" style={{background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginTop: '15px'}}>
          <p><strong>Extra Km:</strong> {calculations.extraKm} km (+ LKR {calculations.extraKmCost.toFixed(2)})</p>
          <p><strong>Late Hours:</strong> {calculations.lateHours} hrs (+ LKR {calculations.lateFeeCost.toFixed(2)})</p>
          <p><strong>Base Rental:</strong> LKR {(rental.rental_days * car.daily_rate).toFixed(2)}</p>
          <p><strong>Less Advance:</strong> - LKR {rental.advance_payment}</p>
          <h3 style={{borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px', color: '#d9534f'}}>
            Final Balance Due: LKR {calculations.totalDue.toFixed(2)}
          </h3>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn" disabled={loading}>Cancel</button>
          <button onClick={handleConfirmReturn} className="confirm-btn" disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Return & Close'}
          </button>
        </div>

        {loading && (
          <div style={{position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: '#333', color: '#fff', padding: '12px 24px', borderRadius: '30px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 10, whiteSpace: 'nowrap'}}>
            {statusMsg || 'Processing...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReturnRentalModal;