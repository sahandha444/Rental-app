// File: src/components/ReturnRentalModal.js

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { generateInvoicePDF } from '../utils/InvoiceGenerator'; // <-- Import your new file
import { v4 as uuidv4 } from 'uuid';
import './ReturnRentalModal.css'; // You can create a simple CSS file for this

const ReturnRentalModal = ({ rental, car, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
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
    const allowedKm = (rental.rental_days * (car.km_limit_per_day || 100)); // Default 100 if null
    
    let extraKm = 0;
    if (driven > allowedKm) {
      extraKm = driven - allowedKm;
    }
    const extraKmCost = extraKm * (car.extra_km_price || 0);

    // B. Time/Late Fee Calc
    // Logic: Compare Selected Return Date vs Expected End Date
    // For simplicity, this example calculates manual late hours if needed, 
    // or we can just automate it based on dates. 
    // Let's assume 0 late hours for now unless you add a 'Late Hours' input, 
    // OR calculate based on dates:
    const expectedEnd = new Date(rental.rental_start_date);
    expectedEnd.setDate(expectedEnd.getDate() + rental.rental_days);
    const actualReturn = new Date(returnDate);
    
    // Calculate difference in hours (rough estimate)
    let lateHours = 0;
    const diffTime = actualReturn - expectedEnd;
    if (diffTime > 0) {
      lateHours = Math.ceil(diffTime / (1000 * 60 * 60)); 
      // If it's just 1 day late, it might show 24 hours. Adjust logic as needed.
    }
    const lateFeeCost = lateHours * (car.late_fee_per_hour || 0);

    // C. Final Total
    // Base Rental Cost was already agreed. We only add extras here.
    // Total = (Base Cost) + (Extra Km) + (Late Fee) + (Damages) - (Advance)
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

  }, [endMileage, returnDate, damageCost, rental, car]);


  // --- 2. Handle Submit ---
  const handleConfirmReturn = async () => {
    if (!endMileage) return alert("Please enter ending mileage");
    
    setLoading(true);
    try {
      // A. Generate Invoice PDF
      const returnData = {
        returnDate,
        endMileage,
        extraKm: calculations.extraKm,
        lateHours: calculations.lateHours,
        damageCost: parseFloat(damageCost),
        finalTotal: calculations.totalDue
      };

      console.log("Generating Invoice...");
      const invoiceFile = await generateInvoicePDF(rental, car, returnData);
      
      // B. Upload Invoice
      const fileName = `invoice-${rental.id}-${uuidv4()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('invoices') // Make sure you create this bucket!
        .upload(fileName, invoiceFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      // C. Update Rental Record (Close it)
      const { error: updateError } = await supabase
        .from('rentals')
        .update({
          status: 'completed',
          return_date: returnDate,
          end_mileage: endMileage,
          final_total_cost: calculations.totalDue,
          return_invoice_pdf_url: publicUrlData.publicUrl,
          remarks_return: remarks
        })
        .eq('id', rental.id);

      if (updateError) throw updateError;

      // D. Update Car Status (Free it up)
      const { error: carError } = await supabase
        .from('vehicles')
        .update({ 
          status: 'Available',
          current_mileage: endMileage // Update car's mileage
        })
        .eq('id', car.id);

      if (carError) throw carError;

      // Success!
      onSuccess();

    } catch (error) {
      console.error("Error returning vehicle:", error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Return Vehicle: {car.name}</h2>
        
        <div className="form-group">
          <label>Return Date</label>
          <input 
            type="date" 
            value={returnDate} 
            onChange={(e) => setReturnDate(e.target.value)} 
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

        {/* --- COST SUMMARY --- */}
        <div className="summary-box" style={{background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginTop: '10px'}}>
          <p><strong>Extra Km:</strong> {calculations.extraKm} km (+ LKR {calculations.extraKmCost.toFixed(2)})</p>
          <p><strong>Late Hours:</strong> {calculations.lateHours} hrs (+ LKR {calculations.lateFeeCost.toFixed(2)})</p>
          <p><strong>Base Rental:</strong> LKR {(rental.rental_days * car.daily_rate).toFixed(2)}</p>
          <p><strong>Less Advance:</strong> - LKR {rental.advance_payment}</p>
          <h3 style={{borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '10px'}}>
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
            {loading ? 'Processing Invoice...' : 'Confirm Return & Create Invoice'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReturnRentalModal;