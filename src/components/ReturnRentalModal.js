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
    if (diffMs > 0) lateHours = Math.floor(diffMs / (1000 * 60 * 60));
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
      const sigFileName = `signatures/${uuidv4()}-return-sig.png`; // <--- Folder path
      
      const { error: sigError } = await supabase.storage
        .from('photos') // <--- USING PHOTOS BUCKET
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

      // B. Generate & Upload Invoice (To 'photos' bucket)
      setStatusMsg('Generating Invoice... 🧾');
      const invoiceFile = await generateInvoicePDF(rental, car, returnData);
      const invFileName = `invoices/invoice-${rental.id}-${uuidv4()}.pdf`; // <--- Folder path
      
      await supabase.storage.from('photos').upload(invFileName, invoiceFile); // <--- USING PHOTOS BUCKET
      const { data: invUrlData } = supabase.storage.from('photos').getPublicUrl(invFileName);

      // C. Generate & Upload Return Agreement (To 'photos' bucket)
      setStatusMsg('Generating Return Doc... 📄');
      const returnDocFile = await generateReturnAgreementPDF(rental, car, returnData);
      const returnDocName = `agreements/return-doc-${rental.id}-${uuidv4()}.pdf`; // <--- Folder path
      
      await supabase.storage.from('photos').upload(returnDocName, returnDocFile); // <--- USING PHOTOS BUCKET
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
          return_agreement_pdf_url: returnDocData.publicUrl, // Save new doc URL
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
        <h2>Return Vehicle: {car.name}</h2>
        
        <div className="form-group">
          <label>Return Date & Time</label>
          <input type="datetime-local" value={returnDateTime} onChange={(e) => setReturnDateTime(e.target.value)} style={{fontSize: '16px', padding: '8px'}} />
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

        <label style={{marginTop: '10px', display: 'block', fontWeight: 'bold'}}>Return Signature (Customer)</label>
        <div className="signature-box" style={{border: '1px dashed #000', borderRadius: '5px', background: '#fff'}}>
          <SignatureCanvas ref={sigPad} penColor='black' canvasProps={{ className: 'sig-canvas', style: {width: '100%', height: '120px'} }} />
        </div>
        <button type="button" onClick={clearSignature} style={{marginTop: '5px', fontSize: '0.8rem', padding: '5px'}}>Clear Signature</button>

        <div className="summary-box" style={{background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginTop: '15px'}}>
          <p><strong>Extra Km:</strong> {calculations.extraKm} km (+ LKR {calculations.extraKmCost.toFixed(2)})</p>
          <p><strong>Late Hours:</strong> {calculations.lateHours} hrs (+ LKR {calculations.lateFeeCost.toFixed(2)})</p>
          <p><strong>Base Rental:</strong> LKR {(rental.rental_days * car.daily_rate).toFixed(2)}</p>
          <p><strong>Less Advance:</strong> - LKR {rental.advance_payment}</p>
          <h3 style={{borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px', color: '#d9534f'}}>
            Final Balance Due: LKR {calculations.totalDue.toFixed(2)}
          </h3>
        </div>

        <div className="modal-actions" style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
          <button onClick={onClose} className="cancel-btn" disabled={loading}>Cancel</button>
          <button onClick={handleConfirmReturn} className="confirm-btn" disabled={loading} style={{background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px'}}>
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