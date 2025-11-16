// File: src/components/ReturnRentalModal.js

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import { v4 as uuidv4 } from 'uuid';

// Helper to convert signature to file
function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

const ReturnRentalModal = ({ rental, car, onClose, onSuccess }) => {
  const [endMileage, setEndMileage] = useState('');
  const [returnDate] = useState(new Date()); // Auto-set to now
  const [submitting, setSubmitting] = useState(false);
  const sigPad = useRef(null);

  // --- Calculations ---
  const startMileage = rental.start_mileage || 0;
  const allowedMileage = rental.rental_days * 100; // Example: 100km per day limit
  const distanceDriven = endMileage ? parseFloat(endMileage) - startMileage : 0;
  const extraKm = Math.max(0, distanceDriven - allowedMileage);
  const extraCost = extraKm * (car?.extra_mileage_rate || 0);
  // Simple calculation: (Days * Rate) + Extra Mileage Cost - Advance
  const baseCost = rental.rental_days * (car?.daily_rate || 0);
  const totalCost = baseCost + extraCost;
  const finalBalance = totalCost - (rental.advance_payment || 0);

  // --- Generate Invoice PDF ---
  const generateInvoicePDF = () => {
    const doc = new jsPDF();
    const signatureImage = sigPad.current.toDataURL('image/png');

    doc.setFontSize(20);
    doc.text("FINAL INVOICE", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Invoice #: INV-${rental.id}`, 20, 40);
    doc.text(`Date: ${returnDate.toLocaleString()}`, 20, 50);
    doc.text(`Customer: ${rental.customer_name}`, 20, 60);
    
    doc.text("--- Vehicle Return Details ---", 20, 80);
    doc.text(`Car: ${rental.car_name}`, 20, 90);
    doc.text(`Start Mileage: ${startMileage} km`, 20, 100);
    doc.text(`End Mileage: ${endMileage} km`, 20, 110);
    doc.text(`Total Distance: ${distanceDriven} km`, 20, 120);
    
    doc.text("--- Cost Breakdown ---", 20, 140);
    doc.text(`Base Rental (${rental.rental_days} days): LKR ${baseCost.toFixed(2)}`, 20, 150);
    doc.text(`Extra Mileage (${extraKm} km @ ${car.extra_mileage_rate}/km): LKR ${extraCost.toFixed(2)}`, 20, 160);
    doc.text(`Subtotal: LKR ${totalCost.toFixed(2)}`, 20, 170);
    doc.text(`Less Advance: - LKR ${rental.advance_payment.toFixed(2)}`, 20, 180);
    
    doc.setFontSize(16);
    doc.text(`FINAL BALANCE DUE: LKR ${finalBalance.toFixed(2)}`, 20, 200);
    
    doc.setFontSize(12);
    doc.text("Customer Signature (Return Confirmation):", 20, 220);
    doc.addImage(signatureImage, 'PNG', 20, 225, 80, 25);

    const pdfBlob = doc.output('blob');
    return new File([pdfBlob], `invoice-${rental.id}.pdf`, { type: 'application/pdf' });
  };

  const handleReturn = async () => {
    if (!endMileage || sigPad.current.isEmpty()) {
      alert("Please enter end mileage and sign.");
      return;
    }
    if (parseFloat(endMileage) < startMileage) {
      alert("End mileage cannot be less than start mileage.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload Signature
      const signatureFile = dataURLtoFile(sigPad.current.toDataURL('image/png'), `return-sig-${uuidv4()}.png`);
      const { data: sigData, error: sigError } = await supabase.storage
        .from('photos') // Using your existing bucket
        .upload(`signatures/${signatureFile.name}`, signatureFile);
      if (sigError) throw sigError;
      const sigUrl = supabase.storage.from('photos').getPublicUrl(`signatures/${signatureFile.name}`).data.publicUrl;

      // 2. Upload Invoice PDF
      const invoiceFile = generateInvoicePDF();
      const { error: pdfError } = await supabase.storage
        .from('photos')
        .upload(`agreements/${invoiceFile.name}`, invoiceFile); // Reusing agreements folder
      if (pdfError) throw pdfError;
      const invoiceUrl = supabase.storage.from('photos').getPublicUrl(`agreements/${invoiceFile.name}`).data.publicUrl;
      
      // 3. Create Short Link for Invoice (Securely via Function, like before)
      // We'll use the same logic: pass the long URL to the SMS function

      // 4. Update Rental Record
      const { error: updateError } = await supabase
        .from('rentals')
        .update({
          status: 'completed',
          return_date: returnDate,
          end_mileage: parseFloat(endMileage),
          extra_mileage_cost: extraCost,
          final_total_cost: finalBalance,
          return_signature_url: sigUrl,
          invoice_pdf_url: invoiceUrl
        })
        .eq('id', rental.id);
      if (updateError) throw updateError;

      // 5. Mark Car Available
      await supabase.from('vehicles').update({ status: 'Available', current_mileage: parseFloat(endMileage) }).eq('id', rental.car_id);

      // 6. Create Short Link & Send SMS
      // We re-use your 'send-local-sms' function!
      // We just need to format the message slightly differently in the function,
      // OR we can make the function generic.
      // For now, let's send the invoice URL as the 'shortLink' payload.
      
      // We need to manually create the short link here because we want to store it? 
      // Actually, your `send-local-sms` function handles creation.
      // We'll just call it.
      
      // Wait... your `send-local-sms` function creates a short link for `agreementUrl`.
      // Let's assume we can use it for `invoiceUrl` too if we pass it as `agreementUrl` (or update the function to be generic).
      // Let's update the SMS function call to pass the invoice URL.
      
      const appUrl = window.location.origin; 
      const shortId = Math.random().toString(36).substring(2, 8);
      const newShortLink = { id: shortId, long_url: invoiceUrl };
      
      // Create short link in DB first (since we moved logic to client in one version, check your latest implementation)
      // Wait, the LATEST implementation moved logic to the SERVER function. 
      // So we just send the LONG URL to the function.
      
      await supabase.functions.invoke('send-local-sms', {
        body: { 
          customerPhone: rental.customer_phone,
          customerName: rental.customer_name,
          agreementUrl: invoiceUrl, // Using this parameter name so we don't have to change the Edge Function code!
          // (Ideally, rename 'agreementUrl' to 'documentUrl' in the function later)
          type: 'invoice' // Optional flag if you want to change message text in future
        }
      });

      alert("Vehicle returned successfully! Invoice sent.");
      onSuccess(); // Refresh parent list

    } catch (error) {
      console.error("Return failed:", error);
      alert("Error processing return: " + error.message);
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{maxWidth: '600px', textAlign: 'left'}}>
        <h2>Return Vehicle: {rental.car_name}</h2>
        <p className="text-muted">Customer: {rental.customer_name}</p>
        
        <div className="form-group" style={{marginBottom: '1rem'}}>
          <label>Return Date:</label>
          <input type="text" className="form-input" value={returnDate.toLocaleString()} disabled />
        </div>

        <div className="form-group" style={{marginBottom: '1rem'}}>
          <label>End Mileage (Start: {startMileage} km):</label>
          <input 
            type="number" 
            className="form-input" 
            value={endMileage} 
            onChange={(e) => setEndMileage(e.target.value)} 
            placeholder="Enter current odometer reading"
          />
        </div>

        {/* Calculation Display */}
        <div className="cost-display" style={{padding: '1rem', fontSize: '0.9rem'}}>
          <p>Distance: {distanceDriven} km {extraKm > 0 && <span className="text-danger">({extraKm} km over limit)</span>}</p>
          <p>Extra Mileage Cost: LKR {extraCost.toFixed(2)}</p>
          <h3>Balance to Pay: LKR {finalBalance.toFixed(2)}</h3>
        </div>

        <label style={{marginTop: '1rem', display: 'block'}}>Customer Signature (Confirm Return):</label>
        <div className="signature-box" style={{height: '150px'}}>
          <SignatureCanvas ref={sigPad} penColor='black' canvasProps={{ className: 'sig-canvas', style: {width: '100%', height: '100%'} }} />
        </div>
        <button type="button" className="clear-button" onClick={() => sigPad.current.clear()} style={{marginTop: '5px', padding: '5px 10px', fontSize: '0.8rem'}}>Clear</button>

        <div className="modal-actions">
          <button className="modal-button cancel" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="modal-button confirm" onClick={handleReturn} disabled={submitting}>
            {submitting ? 'Processing...' : 'Confirm Return & Send Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnRentalModal;