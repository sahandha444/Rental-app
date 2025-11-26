// File: src/components/RentalSteps.js
import React, { useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

// --- FIX: Using extensions bypasses the Android 13+ Photo Picker ---
// This forces the "System File Chooser" which includes the Camera button.
const FILE_ACCEPT = ".jpg, .jpeg, .png, .webp, .heic";

// --- STEP 1: CUSTOMER DETAILS ---
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
      <input type="file" id="licensePhotoFront" className="form-input" accept={FILE_ACCEPT} onChange={handleFileChange} />
      
      <label>Driver's License (Back)</label>
      {formData.existingLicenseBack && <div style={{fontSize: '12px', color: 'green', marginBottom: '5px'}}>✅ Previous photo loaded. Upload new file to replace.</div>}
      <input type="file" id="licensePhotoBack" className="form-input" accept={FILE_ACCEPT} onChange={handleFileChange} />

      <label>ID Card (Front) (Optional)</label>
      {formData.existingIdFront && <div style={{fontSize: '12px', color: 'green', marginBottom: '5px'}}>✅ Previous photo loaded.</div>}
      <input type="file" id="idCardPhotoFront" className="form-input" accept={FILE_ACCEPT} onChange={handleFileChange} />
      
      <label>ID Card (Back) (Optional)</label>
      {formData.existingIdBack && <div style={{fontSize: '12px', color: 'green', marginBottom: '5px'}}>✅ Previous photo loaded.</div>}
      <input type="file" id="idCardPhotoBack" className="form-input" accept={FILE_ACCEPT} onChange={handleFileChange} />

      <label htmlFor="remarksStep1">Remarks (Step 1)</label>
      <textarea id="remarksStep1" className="form-input" value={formData.remarksStep1} onChange={handleTextChange} />

      <div className="form-navigation">
        <button type="button" className="submit-button" onClick={nextStep}>Next</button>
      </div>
    </div>
  );
};

// --- STEP 2: RENTAL DETAILS ---
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
      <input type="file" id="mileagePhoto" className="form-input" accept={FILE_ACCEPT} onChange={handleFileChange} required />
      
      <label htmlFor="extraCarPhotos">Extra Car Photos (Optional, max 5)</label>
      <input type="file" id="extraCarPhotos" className="form-input" accept={FILE_ACCEPT} onChange={handleFileChange} multiple />
      
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

// --- STEP 3: AGREEMENT ---
export const RentalStep3 = ({ formData, car, totalCost, agreementBoxRef, sigPadRef, clearSignature, prevStep, submitting }) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; 
  const day = today.getDate();
  const returnDate = new Date(today);
  returnDate.setDate(today.getDate() + (parseInt(formData.rentalDays) || 1));
  const rYear = returnDate.getFullYear();
  const rMonth = returnDate.getMonth() + 1;
  const rDay = returnDate.getDate();
  const blankStyle = { fontWeight: 'bold', textDecoration: 'underline', padding: '0 5px' };

  return (
    <div className="form-step-container">
      <h2>Step 3: Agreement & Confirmation</h2>
      <div ref={agreementBoxRef} className="agreement-box" style={{border: '1px solid #ccc', padding: '40px', background: '#fff', fontFamily: '"Iskoola Pota", "Noto Sans Sinhala", Arial, sans-serif', color: '#000', lineHeight: '1.6', fontSize: '13px', textAlign: 'justify'}}>
        <h3 style={{textAlign: 'center', textDecoration: 'underline', marginBottom: '15px', fontSize: '18px'}}>එකඟතා ගිවිසුමයි</h3>
        <p><span style={blankStyle}>{year}</span> වර්ෂ <span style={blankStyle}>{month}</span> මස <span style={blankStyle}>{day}</span> දින දීය.</p>
        <p>පොල් පිටියවත්ත, රස්සන්න්දෙණිය, දෙවිනුවර පදිංචි ජී. එච්. එස්. තාරක වන මම සහ <span style={blankStyle}> {formData.customerAddress} </span> පදිංචි <span style={blankStyle}> {formData.customerName} </span> වන දෙවන පාර්ශවය වන මම, <span style={blankStyle}>{year}</span> වර්ෂ <span style={blankStyle}>{month}</span> මස <span style={blankStyle}>{day}</span> වන දින මාතර දි ඇති කර ගන්නා ලද අංක <span style={blankStyle}>{car.plate_number}</span> දරණ <span style={blankStyle}> {car.name}</span> වර්ගයේ වාහනය කුලියට ලබා ගැනීම පිළිබඳ ගිවිසුම මෙසේය.</p>
        <div style={{marginTop: '10px'}}>
          <p>1). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය දෙවන පාර්ශවය විසින් කුලී පදනම මත පාවිච්චි කිරීමට ලබා ගැනීම සිදු විය.</p>
          <p>2). ඉහත කී අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය <span style={blankStyle}>{year}/{month}/{day}</span> දින ඉහත කී දෙවන පාර්ශවය වන මම පරීක්ෂා කර බලා ධාවනය කිරීමට හැකි හොඳ තත්වයේ පවතින බවට සැහීමකට පත් වී මෙම වාහනයේ යතුර, රක්ෂණ සහතිකය සහ ආදායම් බලපත්‍රයේ පිටපත ද සමග භාර ගතිමි.</p>
          <p>3). ඉහත අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය භාරගත් මොහොතේ සිට සියළු වගකීම් දෙවන පාර්ශවය වන මා සතු වන අතර ඇප වශයෙන් ශ්‍රී ලංකාවේ වලංගු මුදලින් රුපියල් <span style={blankStyle}>{formData.advancePayment || '_______'}</span> ක මුදලක් තැන්පත් කල යුතුවේ. එම මුදල නැවත වාහනය භාරදුන් පසු මෙහි පහත කොන්දේසි වලට යටත්ව ආපසු ගෙවනු ලැබේ.</p>
          <p>4). එනම්, වාහනයට යම්කිසි අලාභ හානියක් කර තිබුණහොත් හෝ අලුත් වැඩියාවක් වාහනය ලබාගත් පුද්ගලයා භාරයේ තිබියදී සිදුවී ඇත්නම් ඒ සඳහා වැයවෙන මුදල් වාහනය භාරගත් අය නොගෙවන්නේ නම් ඉහත කී තැන්පත් මුදලින් අඩු කර ගනු ලැබේ. තැන්පත් මුදල අළුත්වැඩියාව සඳහා ප්‍රමාණවත් නොවේ නම් ඉතිරි මුදල ද වාහනය භාරගත් පාර්ශවය විසින් ආයතනයට ගෙවිය යුතුය.</p>
          <p>5). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය එක් දිනක් තුල රුපියල් <span style={blankStyle}>{car.daily_rate}</span> ගෙවිය යුතු අතර උපරිම කිලෝ මීටර් <span style={blankStyle}>{car.km_limit_per_day || 100}</span> කට යටත්ව වැඩිවන සෑම කිලෝ මීටරයකටම රුපියල් <span style={blankStyle}>{car.extra_km_price || 0}</span> බැගින් වාහනය භාරගත් පුද්ගලයා විසින් ගෙවිය යුතු වේ.</p>
          <p>6). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය දින දෙකකට වඩා භාරගන්නා අවස්ථාවේදී පහත සඳහන් කරුණු වලට යටත් විය යුතුය.<br/>(අ) <span style={blankStyle}>{year}</span> වර්ෂ <span style={blankStyle}>{month}</span> මස <span style={blankStyle}>{day}</span> දින පැයට ඉහත භාර ගන්නා වාහනය ඉහත ගිවිසගත් මිල ගණන් වලට යටත්ව <span style={blankStyle}>{rYear}</span> වර්ෂ <span style={blankStyle}>{rMonth}</span> මස <span style={blankStyle}>{rDay}</span> දින පැයට ප්‍රථම භාර දිය යුතුය.<br/>(ආ) එසේ භාර දීමට නොහැකි වන අවස්ථාවකදී ප්‍රමාද වන සැම එක් පැයක් සඳහාම ප්‍රමාද ගාස්තු වශයෙන් රුපියල් <span style={blankStyle}>{car.late_fee_per_hour || '___'}</span> ක මුදලක් අමතරව ගෙවිය යුතු වේ.</p>
          <p>7). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනයට යම්කිසි අනතුරක් සිදු වුවහොත් වාහනයේ අයිතිකරු වන ජී. එච්. එස්. තාරක යන අයගේ කැමැත්ත පරිදි රක්ෂණ සමාගම මගින් අලාභ මුදල් ලබා ගත්තේද? නැද්ද? යන්න තීරණය වන අතර අලාභ මුදල් ගෙවීම රක්ෂණ සමාගම ප්‍රතික්ෂේප කලහොත් වාහනය පාවිච්චි කිරීමට ලබා ගත් පුද්ගලයා විසින් ඒ සඳහා වැයවන මුදල ගෙවිය යුතුය.</p>
          <p>8). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය භාරගත් තැනත්තා භාරයේ තිබියදී යම්කිසි අනතුරක් සිදුවුව හොත් එම වාහනය අලුත්වැඩියා කිරීම සඳහා ගරාජයක් තුල දින කිහිපයක් තැබීමට සිදු වුවහොත් එසේ ගරාජය තුල තිබෙනා දින ගණන සඳහා වාහන හිමිකරුට සිදුවන පාඩුව දිනකට රුපියල් <span style={blankStyle}>{car.daily_rate}</span> බැගින් වාහන හිමිකරුට ගෙවිය යුතු වේ.</p>
          <p>9). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය නීති විරෝධී කටයුතු සඳහා යොදා ගැනීම තහනම් වන අතර මත් වතුර බී ධාවනය කිරීම ද තහනම් වේ.</p>
          <p>10). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය කිසියම් මාර්ග නීති කඩකිරීමකදී හෝ හදිසි අනතුරකදී හෝ වෙනත් අයෙකුට වාහනය ධාවනය කිරීමට තිබියදී එවැනි යම් අනතුරක් හෝ මාර්ග නීති කඩ කිරීමක් හෝ නීතී විරෝධී කටයුත්තක් සඳහා යොදා ගෙන තිබුන හොත් එකි වගකීම සම්පූර්ණයෙන්ම වාහනය භාරගත් පුද්ගලයා විසින් ගෙවිය යුතු වේ. වාහනයේ හිමිකරු ඒ සඳහා වග කියනු නොලැබේ.</p>
          <p>11). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය යම්කිසි අනතුරකදී හෝ නීතී විරෝධි කටයුත්තක් සඳහා යොදා ගැනීමකදී හෝ පොලිස් භාරයට පත් වුවහොත් එසේ පොලිස් භාරයේ තිබෙන දින ගණන සඳහා දිනකට අලාභ වශයෙන් රුපියල් <span style={blankStyle}>{car.daily_rate}</span> බැගින් වාහනයේ හිමිකරුට ගෙවිය යුතු වේ.</p>
          <p>12). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය භාරගත් තැනැත්තා විසින් තෙවන පාර්ශවයකට කුලියට දීමටද, වෙනත් අයෙකුට පැවරීමටද, විකිණීමටද තහනම් වේ.</p>
          <p>13). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනයේ ගමන් ගන්නා උපරිම මගින් ගණන <span style={blankStyle}>{car.passengers || 4}</span> වේ.</p>
          <p>14). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනයේ එන්ජින් ඔයිල්, කුලන්, සහ ටයර් එයාර් පෙෂර් වැනි වාහනයේ භෞතික තත්වය පරීක්ෂා කර බලා ලබාගත් බවටත් ඒවා නොමැතිකමින් යම් දෝෂයක් වාහනය තුල ඇති වුවහොත් වාහනය භාරගත් පුද්ගලයා ඒ සඳහා අලාභ ගෙවිය යුතුය.</p>
          <p>15). රියදුරු බලපත්‍රයක් නොමැති අයට ද, අවුරුදු 18ට අඩු අයට ද මනා පලපුරුද්දක් නොමැති අයට ද සහ බලපත්‍රයක් ඇති අයවලුන් හට වාහනය පැදවීම තහනම් වන අතර වාහනය භාරගන්නා පුද්ගලයා අදාල සුදුසුකම් සපුරා තිබිය යුතුය.</p>
          <p>16). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය ආපසු භාර දීමේදී ඇතුළත හා පිටත පිරිසිදු කර භාර දිය යුතු අතර එසේ නොමැති අවස්ථාවකදී ඒ සඳහා පිරිසිදු කිරීමට වැය වන මුදල වශයෙන් රුපියල් <span style={blankStyle}>1500/=</span> ක් පිරිසිදු කිරීමේ ගාස්තු වශයෙන් ගෙවිය යුතුය.</p>
          <p>17). අංක <span style={blankStyle}>{car.plate_number}</span> දරණ වාහනය ඉහත සඳහන් වගන්ති හා කොන්දේසි වලට යටත්ව පාවිච්චි කිරීමටත් වාහනය භාර ගත් තත්වයෙන්ම භාර දීමට එකඟ වන මම, වාහන හිමිකරු සමග <span style={blankStyle}>{year}</span> වර්ෂ <span style={blankStyle}>{month}</span> මස <span style={blankStyle}>{day}</span> වන දින මාතර දී ගිවිස ගත් බවට සහතික කරමි.</p>
          <p>18). අප ආයතනය කුලී පදනම මත ලබා දෙනු ලබන්නේ මගී ප්‍රවාහන කටයුතු සඳහා පමණක් වන අතර ඉන් බැහැරව නීති විරෝධි කටයුතු (දැව හා සතුන්, මධ්‍යසාර හා ප්‍රචණ්ඩ ක්‍රියා) සඳහා භාවිතය සපුරා තහනම් වේ.</p>
        </div>
        <div style={{marginTop: '40px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px'}}>
          <div style={{width: '45%'}}>
            <div style={{borderBottom: '1px dotted #000', marginBottom: '5px', height: '40px'}}></div>
            <div>අත්සන (දෙවන පාර් ශවය)</div>
            <div style={{marginTop: '5px'}}>නම: {formData.customerName}</div>
            <div>ජා.හැ.අංකය: {formData.customerID}</div>
            <div>ලිපිනය: {formData.customerAddress}</div>
          </div>
          <div style={{width: '45%'}}>
            <div style={{borderBottom: '1px dotted #000', marginBottom: '5px', height: '40px'}}></div>
            <div>අත්සන (හිමිකරු)</div>
            <div style={{marginTop: '5px'}}>ජා.හැ.අංකය : ..............................</div>
            <div>ලිපිනය: ...........................................</div>
          </div>
        </div>
        <div style={{marginTop: '30px'}}>
          <strong>ඇපකරුවන් :</strong>
          <div style={{marginTop: '15px', display: 'flex', justifyContent: 'space-between'}}>
            <span>1. නම: .....................................................</span>
            <span>අත්සන: ...........................</span>
          </div>
          <div style={{marginTop: '15px', display: 'flex', justifyContent: 'space-between'}}>
            <span>2. නම: .....................................................</span>
            <span>අත්සන: ...........................</span>
          </div>
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