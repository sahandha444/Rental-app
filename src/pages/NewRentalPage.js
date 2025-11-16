// File: src/pages/NewRentalPage.js (Completely Rewritten)

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf'; // <-- Make sure to run: npm install jspdf
import './NewRentalPage.css'; // You'll need to update this CSS for the new fields
import { iskoolaPotaBase64 } from '../components/IskoolaPothaFont.js';

// Helper to convert signature to a file
function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

// --- Main Page Component ---
const NewRentalPage = () => {
  const { carId } = useParams(); 
  const navigate = useNavigate(); 
  const sigPad = useRef(null);

  // --- Main State ---
  const [step, setStep] = useState(1); // Controls the wizard step
  const [car, setCar] = useState(null); // Holds the car data
  const [loading, setLoading] = useState(true); // For fetching car
  const [submitting, setSubmitting] = useState(false); // For final submission
  const [error, setError] = useState(null); // For showing error messages

  // This one state holds ALL form data from all steps
  const [formData, setFormData] = useState({
    // Step 1
    customerName: '',
    customerID: '',
    customerPhone: '',
    customerAddress: '',
    licensePhotoFront: null,
    licensePhotoBack: null,
    idCardPhotoFront: null,
    idCardPhotoBack: null,
    remarksStep1: '',
    // Step 2
    rentalDays: 1,
    startMileage: '',
    advancePayment: '',
    mileagePhoto: null,
    extraCarPhotos: [], // This will be an array of File objects
    remarksStep2: '',
  });

  // --- Fetch Car Details (Runs once) ---
  useEffect(() => {
    const fetchCarDetails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', parseInt(carId, 10)) 
          .single();
          
        if (error) throw error;
        if (data) {
          setCar(data);
          // Set start mileage from car data if available
          setFormData(prev => ({ ...prev, startMileage: data.current_mileage || '' }));
        } else {
          setError("Car not found.");
        }
      } catch (err) {
        console.error("Error fetching car", err.message);
        setError("Error fetching car data.");
      } finally {
        setLoading(false);
      }
    };

    if (carId) {
      fetchCarDetails();
    }
  }, [carId]);

  // --- Helper Functions ---

  // Update state for simple text/number inputs
  const handleTextChange = (e) => {
    const { id, value, type } = e.target;
    // Clear error when user starts typing
    if (error) setError(null);
    setFormData(prev => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) || value : value
    }));
  };

  // Update state for file inputs
  const handleFileChange = (e) => {
    const { id, files } = e.target;
    // Clear error when user starts selecting files
    if (error) setError(null);
    
    if (id === 'extraCarPhotos') {
      if (files.length > 5) {
        setError("You can only upload a maximum of 5 extra photos.");
        e.target.value = null; // Clear the file input
        return;
      }
      // Convert FileList to array
      setFormData(prev => ({ ...prev, [id]: Array.from(files) }));
    } else {
      if (files[0]) {
        setFormData(prev => ({ ...prev, [id]: files[0] }));
      }
    }
  };

  const nextStep = () => {
    // Basic validation before going to next step
    if (step === 1) {
      if (!formData.customerName || !formData.customerID || !formData.customerPhone || !formData.customerAddress || !formData.licensePhotoFront || !formData.licensePhotoBack) {
        showFormError("Please fill all required fields for Step 1.");
        return;
      }
    }
    if (step === 2) {
       if (!formData.rentalDays || !formData.startMileage || !formData.mileagePhoto) {
        showFormError("Please fill all required fields for Step 2.");
        return;
      }
    }
    setError(null); // Clear errors
    setStep(s => s + 1);
  };
  
  const prevStep = () => setStep(s => s - 1);
  const clearSignature = () => sigPad.current.clear();

  // Helper function to show a simple error
  const showFormError = (message) => {
    setError(message);
    console.error("FORM ERROR:", message);
    window.scrollTo(0, 0); // Scroll to top to show the error
  };
  
  // --- PDF Generation Function (Complete, Structured Version) ---
  const generateAgreementPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4'); // Use A4 paper size for better spacing
    const signatureImage = sigPad.current.toDataURL('image/png');
    const totalCost = (formData.rentalDays * (car.daily_rate || 0)).toFixed(2);
    
    const pageMargin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = pageWidth - (pageMargin * 2);
    let yPos = 60; // Start Y position

    // --- Helper for Titles ---
    const addSectionTitle = (title) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(title, pageMargin, yPos);
      yPos += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    };

    // --- Helper for Key-Value Pairs ---
    const addDetail = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, pageMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, pageMargin + 120, yPos); // Indent the value
      yPos += 18;
    };
    
    // --- Helper for Text Paragraphs ---
    const addParagraph = (text) => {
      const lines = doc.splitTextToSize(text, textWidth);
      doc.text(lines, pageMargin, yPos);
      yPos += (lines.length * 12) + 6; // line height + padding
    };
    
    // --- 1. ADD SINHALA FONT ---
    try {
      if (iskoolaPotaBase64) {
        doc.addFileToVFS('IskoolaPota.ttf', iskoolaPotaBase64);
        doc.addFont('IskoolaPota.ttf', 'IskoolaPota', 'normal');
        console.log("Sinhala font added successfully.");
      } else {
        console.warn("Sinhala font base64 string is missing.");
      }
    } catch (e) {
      console.error("Error adding Sinhala font:", e);
    }
    
    // --- 2. DOCUMENT TITLE ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text("Rental Agreement", pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;
    // Set font to Sinhala for the title
    if (iskoolaPotaBase64) doc.setFont('IskoolaPota'); 
    doc.setFontSize(16);
    doc.text("කුලී ගිවිසුම", pageWidth / 2, yPos, { align: 'center' });
    yPos += 30;
    
    // Reset to default font
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    // --- 3. RENTAL DETAILS ---
    addSectionTitle("Rental Details");
    addDetail("Customer Name:", formData.customerName);
    addDetail("Customer ID (NIC):", formData.customerID);
    addDetail("Customer Phone:", formData.customerPhone);
    addDetail("Vehicle:", `${car.name} (${car.plate_number})`);
    addDetail("Start Mileage:", `${formData.startMileage} km`);
    addDetail("Rental Period:", `${formData.rentalDays} days`);
    addDetail("Total Cost:", `LKR ${totalCost}`);
    addDetail("Advance Paid:", `LKR ${formData.advancePayment || 0}`);
    yPos += 20; // Extra space

    // --- 4. TERMS & CONDITIONS (ENGLISH) ---
    addSectionTitle("Terms & Conditions");
    const englishTerms = [
      `1. I, ${formData.customerName}, agree to rent the vehicle ${car.name} for the period and cost specified.`,
      "2. I confirm I have inspected the vehicle, its keys, and documents, and receive it in good, drivable condition.",
      "3. I am responsible for a security deposit. Any damage or repair costs will be deducted. If costs exceed the deposit, I agree to pay the difference.",
      "4. The daily rate includes a maximum km limit. I agree to pay an extra fee for each km over this limit.",
      "5. I will be charged a late fee for every hour the vehicle is returned past the agreed-upon time.",
      "6. I am fully responsible for any accident damage if the insurance company denies the claim.",
      "7. If the vehicle requires garage repair due to my fault, I agree to pay a daily 'loss of income' fee to the owner.",
      "8. I am 100% responsible for all traffic violations, accidents, and any illegal activities.",
      "9. I agree to pay a daily fee if the vehicle is impounded by police for any reason.",
      "10. I confirm I have checked the vehicle's oil, coolant, and tire pressure and am liable for neglect.",
      "11. The vehicle must be returned clean (interior and exterior) or a cleaning fee will be charged.",
      "12. PROHIBITED: Driving under the influence, all illegal activities, letting unlicensed/underage/inexperienced persons drive, sub-leasing, or selling the vehicle."
    ];
    englishTerms.forEach(addParagraph);
    yPos += 20;
    
    // --- Check for New Page ---
    if (yPos > 700) { // Check if we're near the bottom
      doc.addPage();
      yPos = pageMargin;
    }

    // --- 5. TERMS & CONDITIONS (SINHALA) ---
    // SET FONT TO SINHALA
    if (iskoolaPotaBase64) doc.setFont('IskoolaPota'); 
    doc.setFontSize(14);
    doc.text("නියමයන් සහ කොන්දේසි", pageMargin, yPos);
    yPos += 20;
    doc.setFontSize(10);

    const sinhalaTerms = [
      "1. වාහනය පරීක්ෂා කිරීම: වාහනය, යතුරු සහ ලියකියවිලි පරීක්ෂා කර, හොඳ ධාවන තත්වයෙන් භාරගත් බවට මම එකඟ වෙමි.",
      "2. තැන්පතු මුදල: වාහනයේ හානි සඳහා තැන්පතු මුදලින් අඩුකරන අතර, එය ප්‍රමාණවත් නොවන්නේ නම් ඉතිරි මුදල ගෙවීමට මම එකඟ වෙමි.",
      "3. අමතර ගාස්තු: නියමිත කිලෝමීටර් සීමාව ඉක්මවූ විට, එක් එක් අමතර කිලෝමීටරය සඳහා ගාස්තුවක් ගෙවීමට මම එකඟ වෙමි.",
      "4. ප්‍රමාද ගාස්තු: නියමිත වේලාවට වාහනය භාර දීමට නොහැකි වුවහොත්, ප්‍රමාද වන සෑම පැයකටම අමතර ගාස්තුවක් ගෙවීමට මම එකඟ වෙමි.",
      "5. රක්ෂණ: රක්ෂණ සමාගම අලාභ ගෙවීම ප්‍රතික්ෂේප කළහොත්, සම්පූර්ණ අලාභය ගෙවීමට මම වගකිව යුතුය.",
      "6. ගරාජ් ගාස්තු: මගේ වරදක් නිසා සිදුවන අනතුරකදී, වාහනය ගරාජයේ තබන දින ගණන සඳහා දෛනික පාඩු ගාස්තුවක් ගෙවීමට මම එකඟ වෙමි.",
      "7. වගකීම: සියලුම මාර්ග නීති කඩකිරීම්, අනතුරු සහ නීති විරෝධී ක්‍රියා සඳහා සම්පූර්ණ වගකීම මම දරමි.",
      "8. පොලිස් භාරය: මගේ භාවිතය හේතුවෙන් වාහනය පොලිස් භාරයට පත්වුවහොTත්, ඒ දින ගණන සඳහා දෛනික අලාභයක් ගෙවීමට මම එකඟ වෙමි.",
      "9. නඩත්තුව: වාහනයේ එන්ජින් ඔයිල්, කූලන්ට් සහ ටයර් පීඩනය මා විසින් පරීක්ෂා කළ බවත්, එසේ නොකිරීමෙන් සිදුවන හානියට මා වගකිව යුතු බවත් සහතික කරමි.",
      "10. පිරිසිදු කිරීම: වාහනය ආපසු භාර දීමේදී ඇතුළත හා පිටත පිරිසිදු කර භාර දිය යුතු අතර, එසේ නොමැති නම් පිරිසිදු කිරීමේ ගාස්තුවක් ගෙවීමට මම එකඟ වෙමි.",
      "11. තහනම්: මත්පැන් පානය කර රිය පැදවීම, නීති විරෝධී කටයුතු, බලපත්‍ර රහිත/නුපුහුණු අයට පැදවීමට දීම, සහ වෙනත් අයට කුලියට දීම සපුරා තහනම්."
    ];
    sinhalaTerms.forEach(addParagraph);

    // --- 6. SIGNATURE ---
    // Reset to default font
    doc.setFont('helvetica', 'normal');
    yPos += 30;
    
    // Check for New Page again
    if (yPos > 740) {
      doc.addPage();
      yPos = pageMargin;
    }
    
    doc.text("Customer Signature / පාරිභෝගික අත්සන:", pageMargin, yPos);
    yPos += 10;
    doc.addImage(signatureImage, 'PNG', pageMargin, yPos, 180, 60); // Add signature
    doc.line(pageMargin, yPos + 70, pageMargin + 200, yPos + 70); // Add signature line
    doc.text(formData.customerName, pageMargin, yPos + 85);

    // --- 7. FINAL OUTPUT ---
    const pdfBlob = doc.output('blob');
    // THIS IS THE CORRECTED LINE:
    return new File([pdfBlob], `agreement-${formData.customerID}-${uuidv4()}.pdf`, { type: 'application/pdf' });
  };


  // --- Main Submission Function ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sigPad.current.isEmpty()) {
      showFormError("Customer signature is required to confirm.");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // --- 1. Helper to upload one file ---
      const uploadFile = async (file, folder) => {
        if (!file) return null; // Skip if no file
        const fileName = `${uuidv4()}-${file.name}`;
        const filePath = `${folder}/${fileName}`; 
        const { error } = await supabase.storage.from('photos').upload(filePath, file);
        if (error) throw error;
        const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
        return data.publicUrl;
      };

      // --- 2. Upload all files in parallel ---
      console.log("Uploading files...");
      const [
        licenseFrontURL,
        licenseBackURL,
        idCardFrontURL,
        idCardBackURL,
        mileagePhotoURL,
        signatureFile,
      ] = await Promise.all([
        uploadFile(formData.licensePhotoFront, 'licenses'),
        uploadFile(formData.licensePhotoBack, 'licenses'),
        uploadFile(formData.idCardPhotoFront, 'id-cards'),
        uploadFile(formData.idCardPhotoBack, 'id-cards'),
        uploadFile(formData.mileagePhoto, 'mileage-photos'),
        dataURLtoFile(sigPad.current.toDataURL('image/png'), `${uuidv4()}-signature.png`)
      ]);
      
      // Upload signature (which was a file)
      const signatureURL = await uploadFile(signatureFile, 'signatures');

      // Upload extra photos (if any)
      let extraPhotosURLs = [];
      if (formData.extraCarPhotos.length > 0) {
        console.log("Uploading extra photos...");
        extraPhotosURLs = await Promise.all(
          formData.extraCarPhotos.map(file => uploadFile(file, 'car-conditions'))
        );
      }
      
      // --- 3. Generate and upload PDF ---
      console.log("Generating PDF...");
      const agreementFile = generateAgreementPDF();
      const agreementPdfURL = await uploadFile(agreementFile, 'agreements');
      console.log("PDF uploaded:", agreementPdfURL);

      // --- 4. Save ALL data to 'rentals' table ---
      console.log("Saving to rentals table...");
      const { error: insertError } = await supabase
        .from('rentals')
        .insert([
          { 
            // Car Info
            car_id: parseInt(carId, 10), 
            car_name: car.name,
            
            // Step 1 Info
            customer_name: formData.customerName,
            customer_id: formData.customerID,
            customer_phone: formData.customerPhone,
            customer_address: formData.customerAddress,
            license_photo_front_url: licenseFrontURL,
            license_photo_back_url: licenseBackURL,
            id_card_front_url: idCardFrontURL,
            id_card_back_url: idCardBackURL,
            remarks_step1: formData.remarksStep1,

            // Step 2 Info
            rental_days: formData.rentalDays,
            start_mileage: formData.startMileage,
            advance_payment: formData.advancePayment,
            mileage_photo_url: mileagePhotoURL,
            extra_car_photos: extraPhotosURLs, // Save the array of URLs
            remarks_step2: formData.remarksStep2,

            // Step 3 Info
            signature_url: signatureURL,
            agreement_pdf_url: agreementPdfURL,

            // Other
            rental_start_date: new Date(),
            status: 'active',
          }
        ]);
        
      if (insertError) throw insertError; 
      
      // --- 5. Update Car Status ---
      console.log("Updating vehicle status...");
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ status: 'Rented', current_mileage: formData.startMileage })
        .eq('id', parseInt(carId, 10)); 
      
      if (updateError) throw updateError;
      
      // --- 6. Send SMS with PDF Link ---
      console.log("Sending SMS...");
      try {
        await supabase.functions.invoke('send-local-sms', {
          body: { 
            customerPhone: formData.customerPhone,
            customerName: formData.customerName,
            agreementUrl: agreementPdfURL // Send the new PDF link!
          }
        });
      } catch (smsError) {
        console.error("SMS function failed (but rental was saved):", smsError.message);
      }
      
      // --- 7. Go Home ---
      navigate('/');
      
    } catch (err) {
      console.error("Full error details:", err);
      showFormError(`Failed to create rental: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // --- JSX Rendering ---

  if (loading) return <h1>Loading car details...</h1>;
  if (error && !car) return <h1>{error}</h1>;
  if (!car) return <h1>Car not found.</h1>;

  const totalCost = (formData.rentalDays * (car.daily_rate || 0)).toFixed(2);

  // --- Step 1: Customer Details ---
  const renderStep1 = () => (
    <div className="form-step-container">
      <h2>Step 1: Customer Details</h2>
      <p>Renting: <strong>{car.name}</strong></p>

      {/* Basic Info */}
      <label htmlFor="customerName">Customer Name</label>
      <input type="text" id="customerName" className="form-input" value={formData.customerName} onChange={handleTextChange} required />
      
      <label htmlFor="customerID">Customer ID (NIC)</label>
      <input type="text" id="customerID" className="form-input" value={formData.customerID} onChange={handleTextChange} required />
      
      <label htmlFor="customerPhone">Customer Phone</label>
      <input type="tel" id="customerPhone" className="form-input" value={formData.customerPhone} onChange={handleTextChange} required />

      <label htmlFor="customerAddress">Customer Address</label>
      <textarea id="customerAddress" className="form-input" value={formData.customerAddress} onChange={handleTextChange} required />

      <hr className="form-divider" />
      
      {/* File Inputs */}
      <label htmlFor="licensePhotoFront">Driver's License (Front) (Required)</label>
      <input type="file" id="licensePhotoFront" className="form-input" accept="image/*" onChange={handleFileChange} required />
      
      <label htmlFor="licensePhotoBack">Driver's License (Back) (Required)</label>
      <input type="file" id="licensePhotoBack" className="form-input" accept="image/*" onChange={handleFileChange} required />

      <label htmlFor="idCardPhotoFront">ID Card (Front) (Optional)</label>
      <input type="file" id="idCardPhotoFront" className="form-input" accept="image/*" onChange={handleFileChange} />
      
      <label htmlFor="idCardPhotoBack">ID Card (Back) (Optional)</label>
      <input type="file" id="idCardPhotoBack" className="form-input" accept="image/*" onChange={handleFileChange} />

      <label htmlFor="remarksStep1">Remarks (Step 1)</label>
      <textarea id="remarksStep1" className="form-input" value={formData.remarksStep1} onChange={handleTextChange} />

      <div className="form-navigation">
        <button type="button" className="submit-button" onClick={nextStep}>Next</button>
      </div>
    </div>
  );

  // --- Step 2: Rental Details ---
  const renderStep2 = () => (
    <div className="form-step-container">
      <h2>Step 2: Rental & Vehicle Details</h2>
      
      <label htmlFor="rentalDays">Rental Period (Days)</label>
      <input type="number" id="rentalDays" className="form-input" value={formData.rentalDays} onChange={handleTextChange} min="1" required />
      
      <label htmlFor="startMileage">Current Mileage (km)</label>
      <input type="number" id="startMileage" className="form-input" value={formData.startMileage} onChange={handleTextChange} required />
      
      <label htmlFor="advancePayment">Advance Payment (LKR)</label>
      <input type="number" id="advancePayment" className="form-input" value={formData.advancePayment} onChange={handleTextChange} />

      <label htmlFor="mileagePhoto">Car Dashboard Photo (Mileage) (Required)</label>
      <input type="file" id="mileagePhoto" className="form-input" accept="image/*" onChange={handleFileChange} required />
      
      <label htmlFor="extraCarPhotos">Extra Car Photos (Optional, max 5)</label>
      <input type="file" id="extraCarPhotos" className="form-input" accept="image/*" onChange={handleFileChange} multiple />
      
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

  // --- Step 3: Confirmation & Signature ---
  const renderStep3 = () => (
    <div className="form-step-container">
      <h2>Step 3: Agreement & Confirmation</h2>
      
      <div className="agreement-box" style={{border: '1px solid #ccc', padding: '15px', borderRadius: '8px', background: '#fafafa'}}>
        <h3>Terms and Conditions</h3>
        <p>Please review the details and sign below.</p>
        
        {/* Summary of details */}
        <div className="summary" style={{background: '#fff', padding: '10px', borderRadius: '5px', marginBottom: '15px'}}>
          <strong>Customer:</strong> {formData.customerName} ({formData.customerID})<br />
          <strong>Vehicle:</strong> {car.name} ({car.plate_number})<br />
          <strong>Period:</strong> {formData.rentalDays} days<br />
          <strong>Total Cost:</strong> LKR {totalCost}<br />
          <strong>Advance:</strong> LKR {formData.advancePayment || 0}
        </div>
        
        <p><strong>Terms and Conditions / නියමයන් සහ කොන්දේසි:</strong></p>
        
        {/* --- ENGLISH TERMS --- */}
        <div style={{textAlign: 'left', paddingLeft: '20px', marginBottom: '15px'}}>
          <strong>In English:</strong>
          <ol style={{fontSize: '12px', paddingLeft: '20px'}}>
            <li>I, {formData.customerName}, agree to rent the vehicle {car.name} for the period and cost specified.</li>
            <li>I confirm I have inspected the vehicle, its keys, and documents, and receive it in good, drivable condition.</li> {/* <-- ADDED POINT */}
            <li>I am responsible for a security deposit. Any damage or repair costs will be deducted. If costs exceed the deposit, I agree to pay the difference.</li>
            <li>The daily rate includes a maximum km limit. I agree to pay an extra fee for each km over this limit.</li>
            <li>I will be charged a late fee for every hour the vehicle is returned past the agreed-upon time.</li>
            <li>I am fully responsible for any accident damage if the insurance company denies the claim.</li>
            <li>If the vehicle requires garage repair due to my fault, I agree to pay a daily 'loss of income' fee to the owner.</li>
            <li>I am 100% responsible for all traffic violations, accidents, and any illegal activities during the rental period.</li>
            <li>I agree to pay a daily fee if the vehicle is impounded by police for any reason related to my use.</li>
            <li>I confirm I have checked the vehicle's engine oil, coolant, and tire pressure and am liable for any damage from neglect.</li>
            <li>The vehicle must be returned clean (interior and exterior) or a cleaning fee will be charged.</li>
            <li style={{fontWeight: 'bold'}}>PROHIBITED: Driving under the influence, all illegal activities, letting unlicensed/underage/inexperienced persons drive, sub-leasing, or selling the vehicle.</li>
          </ol>
        </div>

        {/* --- SINHALA TERMS --- */}
        <div style={{textAlign: 'left', paddingLeft: '20px', fontFamily: 'Arial, "Iskoola Pota", sans-serif'}}>
          <strong>සිංහලෙන්:</strong>
          <ol style={{fontSize: '12px', paddingLeft: '20px'}}>
            <li>වාහනය පරීක්ෂා කිරීම: වාහනය, යතුරු සහ ලියකියවිලි පරීක්ෂා කර, හොඳ ධාවන තත්වයෙන් භාරගත් බවට මම එකඟ වෙමි.</li> {/* <-- ADDED POINT */}
            <li>තැන්පතු මුදල: වාහනයේ හානි සඳහා තැන්පතු මුදලින් අඩුකරන අතර, එය ප්‍රමාණවත් නොවන්නේ නම් ඉතිරි මුදල ගෙවීමට මම එකඟ වෙමි.</li>
            <li>අමතර ගාස්තු: නියමිත කිලෝමීටර් සීමාව ඉක්මවූ විට, එක් එක් අමතර කිලෝමීටරය සඳහා ගාස්තුවක් ගෙවීමට මම එකඟ වෙමි.</li>
            <li>ප්‍රමාද ගාස්තු: නියමිත වේලාවට වාහනය භාර දීමට නොහැකි වුවහොත්, ප්‍රමාද වන සෑම පැයකටම අමතර ගාස්තුවක් ගෙවීමට මම එකඟ වෙමි.</li>
            <li>රක්ෂණ: රක්ෂණ සමාගම අලාභ ගෙවීම ප්‍රතික්ෂේප කළහොත්, සම්පූර්ණ අලාභය ගෙවීමට මම වගකිව යුතුය.</li>
            <li>ගරාජ් ගාස්තු: මගේ වරදක් නිසා සිදුවන අනතුරකදී, වාහනය ගරාජයේ තබන දින ගණන සඳහා දෛනික පාඩු ගාස්තුවක් ගෙවීමට මම එකඟ වෙමි.</li>
            <li>වගකීම: සියලුම මාර්ග නීති කඩකිරීම්, අනතුරු සහ නීති විරෝධී ක්‍රියා සඳහා සම්පූර්ණ වගකීම මම දරමි.</li>
            <li>පොලිස් භාරය: මගේ භාවිතය හේතුවෙන් වාහනය පොලිස් භාරයට පත්වුවහොත්, ඒ දින ගණන සඳහා දෛනික අලාභයක් ගෙවීමට මම එකඟ වෙමි.</li>
            <li>නඩත්තුව: වාහනයේ එන්ජින් ඔයිල්, කූලන්ට් සහ ටයර් පීඩනය මා විසින් පරීක්ෂා කළ බවත්, එසේ නොකිරීමෙන් සිදුවන හානියට මා වගකිව යුතු බවත් සහතික කරමි.</li>
            <li>පිරිසිදු කිරීම: වාහනය ආපසු භාර දීමේදී ඇතුළත හා පිටත පිරිසිදු කර භාර දිය යුතු අතර, එසේ නොමැති නම් පිරිසිදු කිරීමේ ගාස්තුවක් ගෙවීමට මම එකඟ වෙමි.</li>
            <li style={{fontWeight: 'bold'}}>තහනම්: මත්පැන් පානය කර රිය පැදවීම, නීති විරෝධී කටයුතු, බලපත්‍ර රහිත/නුපුහුණු අයට පැදවීමට දීම, සහ වෙනත් අයට කුලියට දීම සපුරා තහනම්.</li>
          </ol>
        </div>
      </div>

      <label style={{marginTop: '20px', display: 'block', fontWeight: 'bold'}}>Customer Signature</label>
      <div className="signature-box" style={{border: '1px dashed #000', borderRadius: '8px', background: '#fff'}}>
        <SignatureCanvas 
          ref={sigPad}
          penColor='black'
          canvasProps={{ className: 'sig-canvas', style: {width: '100%', height: '150px'} }} 
        />
      </div>
      <button type="button" className="clear-button" onClick={clearSignature} style={{marginTop: '10px'}}>
        Clear Signature
      </button>

      <div className="form-navigation" style={{display: 'flex', justifyContent: 'space-between', marginTop: '20px'}}>
        <button type="button" className="clear-button" onClick={prevStep}>Back</button>
        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? 'Saving Rental...' : 'Confirm & Complete Rental'}
        </button>
      </div>
    </div>
  );

  // --- Main Return ---
  return (
    <div className="form-container" style={{maxWidth: '700px', margin: '20px auto', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}}>
      {/* Show an error message if one exists */}
      {error && (
        <div style={{ color: '#D8000C', background: '#FFD2D2', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* We use a <form> wrapper for the handleSubmit */}
      <form className="rental-form" onSubmit={handleSubmit}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </form>
    </div>
  );
};

export default NewRentalPage;

// --- END OF FILE: NewRentalPage.js ---