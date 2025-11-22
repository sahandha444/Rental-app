// File: src/components/RentalSteps.js
import React, { useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export const RentalStep1 = ({ formData, setFormData, car, pastCustomers, handleTextChange, handleFileChange, nextStep }) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearchChange = (e) => {
    setCustomerSearch(e.target.value);
    setShowDropdown(e.target.value.length > 1);
  };

  const selectCustomer = (customer) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.customer_name || '',
      customerID: customer.customer_id || '',
      customerPhone: customer.customer_phone || '',
      customerAddress: customer.customer_address || '',
      existingLicenseFront: customer.license_photo_front_url,
      existingLicenseBack: customer.license_photo_back_url,
      existingIdFront: customer.id_card_front_url,
      existingIdBack: customer.id_card_back_url,
      licensePhotoFront: null,
      licensePhotoBack: null,
      idCardPhotoFront: null,
      idCardPhotoBack: null
    }));
    setCustomerSearch('');
    setShowDropdown(false);
  };

  const filteredCustomers = pastCustomers.filter(c => 
    c.customer_name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.customer_id.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="form-step-container">
      <h2>Step 1: Customer Details</h2>
      <p>Renting: <strong>{car.name}</strong></p>

      {/* Customer Search */}
      <div style={{position: 'relative', marginBottom: '20px', background: '#f0f4f8', padding: '15px', borderRadius: '8px'}}>
        <label style={{color: '#007bff', fontWeight: 'bold'}}>🔁 Returning Customer? Quick Fill:</label>
        <input type="text" placeholder="Search by Name or NIC..." value={customerSearch} onChange={handleSearchChange} className="form-input" style={{marginBottom: 0}} />
        {showDropdown && (
          <ul style={{
            position: 'absolute', top: '100%', left: 0, right: 0, 
            background: 'white', border: '1px solid #ccc', borderRadius: '0 0 5px 5px', 
            listStyle: 'none', padding: 0, margin: 0, zIndex: 1000, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            {filteredCustomers.map(c => (
              <li key={c.id || c.customer_id} onMouseDown={() => selectCustomer(c)} style={{padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', color: '#333'}}>
                <strong>{c.customer_name}</strong> <span style={{color: '#666', fontSize: '0.9em'}}>({c.customer_id})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label htmlFor="customerName">Customer Name</label>
      <input type="text" id="customerName" className="form-input" value={formData.customerName} onChange={handleTextChange} required />
      
      <label htmlFor="customerID">Customer ID (NIC)</label>
      <input type="text" id="customerID" className="form-input" value={formData.customerID} onChange={handleTextChange} required />
      
      <label htmlFor="customerPhone">Customer Phone</label>
      <input type="tel" id="customerPhone" className="form-input" value={formData.customerPhone} onChange={handleTextChange} required />

      <label htmlFor="customerAddress">Customer Address</label>
      <textarea id="customerAddress" className="form-input" value={formData.customerAddress} onChange={handleTextChange} required />

      <hr className="form-divider" />
      
      <label>Driver's License (Front)</label>
      {formData.existingLicenseFront && <div style={{fontSize: '12px', color: 'green', marginBottom: '5px'}}>✅ Previous photo loaded. Upload new file to replace.</div>}
      <input type="file" id="licensePhotoFront" className="form-input" accept="image/*" capture="environment" onChange={handleFileChange} />
      
      <label>Driver's License (Back)</label>
      {formData.existingLicenseBack && <div style={{fontSize: '12px', color: 'green', marginBottom: '5px'}}>✅ Previous photo loaded. Upload new file to replace.</div>}
      <input type="file" id="licensePhotoBack" className="form-input" accept="image/*" capture="environment" onChange={handleFileChange} />

      <label>ID Card (Front) (Optional)</label>
      {formData.existingIdFront && <div style={{fontSize: '12px', color: 'green', marginBottom: '5px'}}>✅ Previous photo loaded.</div>}
      <input type="file" id="idCardPhotoFront" className="form-input" accept="image/*" capture="environment" onChange={handleFileChange} />
      
      <label>ID Card (Back) (Optional)</label>
      {formData.existingIdBack && <div style={{fontSize: '12px', color: 'green', marginBottom: '5px'}}>✅ Previous photo loaded.</div>}
      <input type="file" id="idCardPhotoBack" className="form-input" accept="image/*" capture="environment" onChange={handleFileChange} />

      <label htmlFor="remarksStep1">Remarks (Step 1)</label>
      <textarea id="remarksStep1" className="form-input" value={formData.remarksStep1} onChange={handleTextChange} />

      <div className="form-navigation">
        <button type="button" className="submit-button" onClick={nextStep}>Next</button>
      </div>
    </div>
  );
};

export const RentalStep2 = ({ formData, handleTextChange, handleFileChange, prevStep, nextStep, car, totalCost }) => {
  return (
    <div className="form-step-container">
      <h2>Step 2: Rental & Vehicle Details</h2>
      <label htmlFor="rentalDays">Rental Period (Days)</label>
      <input type="number" id="rentalDays" className="form-input" value={formData.rentalDays} onChange={handleTextChange} min="1" required />
      
      <label htmlFor="startMileage">Current Mileage (km)</label>
      <input type="number" id="startMileage" className="form-input" value={formData.startMileage} onChange={handleTextChange} required />
      
      <label htmlFor="advancePayment">Advance Payment (LKR)</label>
      <input type="number" id="advancePayment" className="form-input" value={formData.advancePayment} onChange={handleTextChange} />

      <label htmlFor="mileagePhoto">Car Dashboard Photo (Mileage) (Required)</label>
      <input type="file" id="mileagePhoto" className="form-input" accept="image/*" capture="environment" onChange={handleFileChange} required />
      
      <label htmlFor="extraCarPhotos">Extra Car Photos (Optional, max 5)</label>
      <input type="file" id="extraCarPhotos" className="form-input" accept="image/*" capture="environment" onChange={handleFileChange} multiple />
      
      <label htmlFor="remarksStep2">Remarks (Step 2)</label>
      <textarea id="remarksStep2" className="form-input" value={formData.remarksStep2} onChange={handleTextChange} />

      <div className="cost-display" style={{marginTop: '20px', padding: '15px', background: '#f4f4f4', borderRadius: '8px', textAlign: 'center'}}>
        <h3>Total Estimated Cost:</h3>
        <h2 style={{margin: '5px 0', color: '#333'}}>LKR {totalCost}</h2>
        <p style={{margin: '0', fontSize: '14px'}}>({formData.rentalDays} days @ LKR {car.daily_rate || 0}/day)</p>
      </div>

      <div className="form-navigation" style={{display: 'flex', justifyContent: 'space-between', marginTop: '20px'}}>
        <button type="button" className="clear-button" onClick={prevStep}>Back</button>
        <button type="button" className="submit-button" onClick={nextStep}>Next</button>
      </div>
    </div>
  );
};

export const RentalStep3 = ({ formData, car, totalCost, agreementBoxRef, sigPadRef, clearSignature, prevStep, submitting }) => {
  return (
    <div className="form-step-container">
      <h2>Step 3: Agreement & Confirmation</h2>
      <div ref={agreementBoxRef} className="agreement-box" style={{border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: '#fafafa'}}>
        <h3 style={{textAlign: 'center'}}>Terms and Conditions / නියමයන් සහ කොන්දේසි:</h3>
        <p>Please review the details below. By signing, you agree to all terms.</p>
        
        <div className="summary" style={{background: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #eee'}}>
          <strong>Customer:</strong> {formData.customerName} ({formData.customerID})<br />
          <strong>Vehicle:</strong> {car.name} ({car.plate_number})<br />
          <strong>Period:</strong> {formData.rentalDays} days<br />
          <strong>Total Cost:</strong> LKR {totalCost}<br />
          <strong>Advance:</strong> LKR {formData.advancePayment || 0}
        </div>
        
        {/* Shortened Terms for readability in code - assume full terms here */}
        <div style={{textAlign: 'left', paddingLeft: '20px', marginBottom: '15px'}}>
            <strong style={{fontSize: '16px'}}>In English:</strong>
            <ol style={{fontSize: '14px', paddingLeft: '20px', lineHeight: '1.6'}}>
                <li>I, {formData.customerName}, agree to rent {car.name} for the period specified.</li>
                <li>I confirm I have inspected the vehicle, keys, and documents.</li>
                <li>I agree to pay <strong>LKR {car.extra_km_price || '___'}</strong> for each extra km.</li>
                <li>I agree to pay <strong>LKR {car.late_fee_per_hour || '___'}</strong> per late hour.</li>
                <li>I am fully responsible for accidents, traffic violations, and illegal activities.</li>
                <li>Vehicle must be returned clean and with same fluid levels.</li>
            </ol>
        </div>
        <div style={{textAlign: 'left', paddingLeft: '20px', fontFamily: 'Arial, "Iskoola Pota", sans-serif'}}>
          <strong style={{fontSize: '16px'}}>සිංහලෙන්:</strong>
          <ol style={{fontSize: '14px', paddingLeft: '20px', lineHeight: '1.6'}}>
            <li>වාහනය පරීක්ෂා කර භාරගත් බවට මම එකඟ වෙමි.</li>
            <li>අමතර කිලෝමීටරයක් සඳහා <strong>රු. {car.extra_km_price || '___'}</strong> ක් ගෙවමි.</li>
            <li>ප්‍රමාද වන සෑම පැයකටම <strong>රු. {car.late_fee_per_hour || '___'}</strong> ක් ගෙවමි.</li>
            <li>සියලුම අනතුරු සහ නීති විරෝධී ක්‍රියා සඳහා මම වගකිව යුතුය.</li>
          </ol>
        </div>
      </div>

      <label style={{marginTop: '20px', display: 'block', fontWeight: 'bold'}}>Customer Signature</label>
      <div className="signature-box" style={{border: '1px dashed #000', borderRadius: '8px', background: '#fff'}}>
        <SignatureCanvas ref={sigPadRef} penColor='black' canvasProps={{ className: 'sig-canvas', style: {width: '100%', height: '150px'} }} />
      </div>
      <button type="button" className="clear-button" onClick={clearSignature} style={{marginTop: '10px'}}>Clear Signature</button>

      <div className="form-navigation" style={{display: 'flex', justifyContent: 'space-between', marginTop: '20px'}}>
        <button type="button" className="clear-button" onClick={prevStep}>Back</button>
        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? 'Saving Rental...' : 'Confirm & Complete Rental'}
        </button>
      </div>
    </div>
  );
};