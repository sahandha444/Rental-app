// File: src/components/ReturnRentalModal.js

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { generateInvoicePDF } from '../utils/InvoiceGenerator'; 
import { dataURLtoFile } from '../utils/pdfHelper'; // Import the helper from your utils
import { v4 as uuidv4 } from 'uuid';
import SignatureCanvas from 'react-signature-canvas'; 
import './ReturnRentalModal.css'; 

const ReturnRentalModal = ({ rental, car, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const sigPad = useRef(null);
  
  // Initialize with Current Date AND Time (local ISO format)
  // Format: YYYY-MM-DDTHH:MM
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const defaultDateTime = now.toISOString().slice(0, 16);

  const [returnDateTime, setReturnDateTime] = useState(defaultDateTime);
  const [endMileage, setEndMileage] = useState('');
  const [damageCost, setDamageCost] = useState(0);
  const [remarks, setRemarks] = useState('');

  // Calculated State
  const [calculations, setCalculations] = useState({
    extraKm: 0,
    extraKmCost: 0,
    lateHours: 0,
    lateFeeCost: 0,
    totalDue: 0
  });

  // --- 1. Real-time Calculations ---
  useEffect(() => {
    if (!rental || !car) return;

    // A. Mileage Calc
    const startMil = parseFloat(rental.start_mileage) || 0;
    const endMil = parseFloat(endMileage) || startMil;
    const driven = endMil - startMil;
    const allowedKm = (rental.rental_days * (car.km_limit_per_day || 100)); 
    
    let extraKm = 0;
    if (driven > allowedKm) {
      extraKm = driven - allowedKm;
    }
    const extraKmCost = extraKm * (car.extra_km_price || 0);

    // B. Time/Late Fee Calc (Specific Hourly Calculation)
    const startDate = new Date(rental.rental_start_date);
    // Expected return time is Start Date + Rental Days (at the same time it started)
    const expectedReturnDate = new Date(startDate);
    expectedReturnDate.setDate(startDate.getDate() + rental.rental_days);
    
    const actualReturnDate = new Date(returnDateTime);

    let lateHours = 0;
    // Calculate difference in milliseconds
    const diffMs = actualReturnDate - expectedReturnDate;
    
    if (diffMs > 0) {
      // Convert ms to hours (Math.ceil to charge for part of an hour)
      lateHours = Math.floor(diffMs / (1000 * 60 * 60));
    }
    const lateFeeCost = lateHours * (car.extra_hourly_rate || 0);

    // C. Final Total
    const baseCost = rental.rental_days * (car.daily_rate || 0);
    const subTotal = baseCost + extraKmCost + lateFeeCost + parseFloat(damageCost);
    const finalDue = subTotal - (rental.advance_payment || 0);

    setCalculations({
      extraKm,
      extraKmCost,
      lateHours,
      lateFeeCost,
      totalDue: finalDue
    });

  }, [endMileage, returnDateTime, damageCost, rental, car]);


  // --- 2. Handle Submit ---
  const handleConfirmReturn = async () => {
    if (!endMileage) return alert("Please enter ending mileage");
    if (sigPad.current.isEmpty()) return alert("Customer signature is required to return.");
    
    setLoading(true);
    try {
      // A. Upload Signature First
      const sigDataUrl = sigPad.current.toDataURL('image/png');
      const sigFile = dataURLtoFile(sigDataUrl, `return-sig-${rental.id}.png`);
      const sigFileName = `${uuidv4()}-return-sig.png`;
      
      const { error: sigError } = await supabase.storage
        .from('signatures')
        .upload(sigFileName, sigFile);
      
      if (sigError) throw sigError;
      
      const { data: sigUrlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(sigFileName);
      
      const signaturePublicUrl = sigUrlData.publicUrl;

      // B. Generate Invoice PDF (Pass signature URL)
      const returnData = {
        returnDate: returnDateTime,
        endMileage,
        extraKm: calculations.extraKm,
        lateHours: calculations.lateHours,
        damageCost: parseFloat(damageCost),
        finalTotal: calculations.totalDue,
        signatureUrl: sigDataUrl // Pass Base64 for PDF generation (faster)
      };

      console.log("Generating Invoice...");
      const invoiceFile = await generateInvoicePDF(rental, car, returnData);
      
      // C. Upload Invoice
      const invFileName = `invoice-${rental.id}-${uuidv4()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(invFileName, invoiceFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(invFileName);

      // D. Update Rental Record (Close it)
      const { error: updateError } = await supabase
        .from('rentals')
        .update({
          status: 'completed',
          return_date: returnDateTime,
          end_mileage: endMileage,
          final_total_cost: calculations.totalDue,
          extra_mileage_cost: calculations.extraKmCost,
          return_invoice_pdf_url: publicUrlData.publicUrl,
          return_signature_url: signaturePublicUrl, // Save signature URL to DB
          remarks_return: remarks
        })
        .eq('id', rental.id);

      if (updateError) throw updateError;

      // E. Update Car Status
      const { error: carError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'Available',
          current_mileage: endMileage
        })
        .eq('id', car.id);

      if (carError) throw carError;

      // --- 🆕 F. SEND INVOICE SMS ---
      try {
        console.log("Sending Invoice SMS...");
        await supabase.functions.invoke('send-local-sms', {
          body: { 
            customerPhone: rental.customer_phone, // Get phone from rental object
            customerName: rental.customer_name,
            link: publicUrlData.publicUrl, // Use the public Invoice URL
            type: 'return' // <--- Tells the backend to send the "Return/Invoice" message
          }
        });
      } catch (smsError) {
        console.warn("Invoice SMS Failed:", smsError);
        // Don't block the UI success if SMS fails
      }

      onSuccess();

    } catch (error) {
      console.error("Error returning vehicle:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => sigPad.current.clear();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Return Vehicle: {car.name}</h2>
        
        {/* Date & Time Picker */}
        <div className="form-group">
          <label>Return Date & Time</label>
          <input 
            type="datetime-local" 
            value={returnDateTime} 
            onChange={(e) => setReturnDateTime(e.target.value)} 
            style={{fontSize: '16px', padding: '8px'}}
          />
        </div>

        <div className="form-group">
          <label>End Mileage (Start: {rental.start_mileage})</label>
          <input 
            type="number" 
            value={endMileage} 
            onChange={(e) => setEndMileage(e.target.value)} 
            placeholder="Enter current km"
          />
        </div>

        <div className="form-group">
          <label>Damages / Repair Cost (LKR)</label>
          <input 
            type="number" 
            value={damageCost} 
            onChange={(e) => setDamageCost(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label>Remarks</label>
          <textarea 
            value={remarks} 
            onChange={(e) => setRemarks(e.target.value)} 
          />
        </div>

        {/* Return Signature */}
        <label style={{marginTop: '10px', display: 'block', fontWeight: 'bold'}}>Return Signature (Customer)</label>
        <div className="signature-box" style={{border: '1px dashed #000', borderRadius: '5px', background: '#fff'}}>
          <SignatureCanvas 
            ref={sigPad}
            penColor='black'
            canvasProps={{ className: 'sig-canvas', style: {width: '100%', height: '120px'} }} 
          />
        </div>
        <button type="button" onClick={clearSignature} style={{marginTop: '5px', fontSize: '0.8rem', padding: '5px'}}>
          Clear Signature
        </button>

        {/* Cost Summary */}
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
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button 
            onClick={handleConfirmReturn} 
            className="confirm-btn" 
            disabled={loading}
            style={{background: '#28a745', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '5px'}}
          >
            {loading ? 'Processing...' : 'Confirm Return & Close'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReturnRentalModal;