// File: src/pages/NewRentalPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression'; 
import './NewRentalPage.css'; 

import { generateAgreementPDF, dataURLtoFile } from '../utils/pdfHelper';
import { RentalStep1, RentalStep2, RentalStep3 } from '../components/RentalSteps';

// --- ⚡ FASTER COMPRESSION SETTINGS ---
const compressImage = async (file) => {
  if (!file) return null;
  const options = {
    maxSizeMB: 0.6,           // <--- Lowered to 0.6MB for speed
    maxWidthOrHeight: 1280,   // <--- Lowered to 1280px (Standard HD) is faster to process
    useWebWorker: true,       
    initialQuality: 0.7,      // <--- Start with slightly lower quality to speed up initial pass
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.warn("Compression skipped:", error);
    return file; 
  }
};

const NewRentalPage = () => {
  const { carId } = useParams(); 
  const navigate = useNavigate(); 
  const sigPad = useRef(null);
  const agreementBoxRef = useRef(null);

  // --- State ---
  const [step, setStep] = useState(1); 
  const [car, setCar] = useState(null); 
  const [loading, setLoading] = useState(true); 
  const [submitting, setSubmitting] = useState(false); 
  
  // 🆕 NEW: Status Message State
  const [statusMsg, setStatusMsg] = useState(''); 
  
  const [error, setError] = useState(null); 
  const [pastCustomers, setPastCustomers] = useState([]);

  const [formData, setFormData] = useState({
    customerName: '', customerID: '', customerPhone: '', customerAddress: '',
    licensePhotoFront: null, licensePhotoBack: null, idCardPhotoFront: null, idCardPhotoBack: null,
    existingLicenseFront: null, existingLicenseBack: null, existingIdFront: null, existingIdBack: null,
    remarksStep1: '',
    rentalDays: 1, startMileage: '', advancePayment: '', mileagePhoto: null, extraCarPhotos: [], remarksStep2: '',
  });

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: carData, error: carError } = await supabase.from('vehicles').select('*').eq('id', parseInt(carId, 10)).single();
        if (carError) throw carError;
        setCar(carData);
        setFormData(prev => ({ ...prev, startMileage: carData.current_mileage || '' }));

        const { data: rentalsData, error: rentalsError } = await supabase
          .from('rentals')
          .select('customer_name, customer_id, customer_phone, customer_address, license_photo_front_url, license_photo_back_url, id_card_front_url, id_card_back_url, rental_start_date') 
          .order('rental_start_date', { ascending: false });

        if (rentalsError) throw rentalsError;

        if (rentalsData) {
          const uniqueCustomers = [];
          const map = new Map();
          for (const item of rentalsData) {
            if (item.customer_id && item.customer_name && !map.has(item.customer_id)) {
              map.set(item.customer_id, true);
              uniqueCustomers.push(item);
            }
          }
          setPastCustomers(uniqueCustomers);
        }
      } catch (err) {
        console.warn("Fetch Error:", err.message);
        if (!car) setError("Error fetching data.");
      } finally {
        setLoading(false);
      }
    };
    if (carId) fetchData();
  }, [carId]);

  // --- Event Handlers ---
  const handleTextChange = (e) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({ ...prev, [id]: type === 'number' ? parseFloat(value) || value : value }));
  };

  const handleFileChange = (e) => {
    const { id, files } = e.target;
    if (id === 'extraCarPhotos') {
      if (files.length > 5) return alert("Max 5 photos.");
      setFormData(prev => ({ ...prev, [id]: Array.from(files) }));
    } else if (files[0]) {
      setFormData(prev => ({ ...prev, [id]: files[0] }));
    }
  };

// --- Validation & Navigation ---
  const nextStep = () => {
    // Validate Step 1: Customer Details
    if (step === 1) {
      // Check for License photos (New Upload OR Existing from search)
      const hasLicenseFront = formData.licensePhotoFront || formData.existingLicenseFront;
      const hasLicenseBack = formData.licensePhotoBack || formData.existingLicenseBack;

      if (!formData.customerName || !formData.customerID || !formData.customerPhone || !formData.customerAddress) {
        showFormError("Please fill in all Customer Details.");
        return;
      }
      if (!hasLicenseFront || !hasLicenseBack) {
        showFormError("Driver's License photos (Front & Back) are required.");
        return;
      }
    }

    // Validate Step 2: Rental Details
    if (step === 2) {
       if (!formData.rentalDays || !formData.startMileage || !formData.advancePayment) {
        showFormError("Please enter Rental Days,Start Mileage and Advance Payment.");
        return;
      }
      if (!formData.mileagePhoto) {
        showFormError("A photo of the dashboard mileage is required.");
        return;
      }
    }

    // If validation passes, go to next step
    setError(null); 
    setStep(s => s + 1);
  };

  const showFormError = (message) => {
    setError(message);
    window.scrollTo(0, 0); 
  };

  const prevStep = () => setStep(s => s - 1);
  const clearSignature = () => sigPad.current.clear();

  // --- Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sigPad.current.isEmpty()) return alert("Signature required.");
    
    setSubmitting(true);
    setStatusMsg('Preparing...'); // Start status
    
    try {
      const uploadFile = async (file, folder) => {
        if (!file) return null; 
        const fileName = `${uuidv4()}-${file.name}`;
        const filePath = `${folder}/${fileName}`; 
        await supabase.storage.from('photos').upload(filePath, file);
        return supabase.storage.from('photos').getPublicUrl(filePath).data.publicUrl;
      };

      // 1. Compression
      setStatusMsg('Compressing Photos... 📸');
      
      const [
        cmpLicenseFront, 
        cmpLicenseBack, 
        cmpIdFront, 
        cmpIdBack, 
        cmpMileage,
        cmpExtraPhotos
      ] = await Promise.all([
        compressImage(formData.licensePhotoFront),
        compressImage(formData.licensePhotoBack),
        compressImage(formData.idCardPhotoFront),
        compressImage(formData.idCardPhotoBack),
        compressImage(formData.mileagePhoto),
        Promise.all(formData.extraCarPhotos.map(p => compressImage(p))) 
      ]);

      // 2. Uploading
      setStatusMsg('Uploading Files... ☁️');

      const [lf, lb, if_, ib, mp, sigFile] = await Promise.all([
        uploadFile(cmpLicenseFront, 'licenses'), 
        uploadFile(cmpLicenseBack, 'licenses'),
        uploadFile(cmpIdFront, 'id-cards'), 
        uploadFile(cmpIdBack, 'id-cards'),
        uploadFile(cmpMileage, 'mileage-photos'),
        dataURLtoFile(sigPad.current.toDataURL('image/png'), `${uuidv4()}-signature.png`) 
      ]);
      
      const sigUrl = await uploadFile(sigFile, 'signatures');

      const extraPhotos = await Promise.all(
        cmpExtraPhotos.map(f => uploadFile(f, 'car-conditions'))
      );

      // 3. PDF Generation
      setStatusMsg('Creating Agreement... 📄');
      const pdfFile = await generateAgreementPDF(agreementBoxRef.current, sigPad.current.getCanvas(), formData);
      const pdfUrl = await uploadFile(pdfFile, 'agreements');

      // 4. Saving
      setStatusMsg('Finalizing... 💾');
      await supabase.from('rentals').insert([{ 
          car_id: car.id, car_name: car.name,
          customer_name: formData.customerName, customer_id: formData.customerID,
          customer_phone: formData.customerPhone, customer_address: formData.customerAddress,
          license_photo_front_url: lf || formData.existingLicenseFront,
          license_photo_back_url: lb || formData.existingLicenseBack,
          id_card_front_url: if_ || formData.existingIdFront,
          id_card_back_url: ib || formData.existingIdBack,
          remarks_step1: formData.remarksStep1, rental_days: formData.rentalDays,
          start_mileage: formData.startMileage, advance_payment: formData.advancePayment,
          mileage_photo_url: mp, extra_car_photos: extraPhotos, remarks_step2: formData.remarksStep2,
          signature_url: sigUrl, agreement_pdf_url: pdfUrl,
          rental_start_date: new Date(), status: 'active',
      }]);
      
      await supabase.from('vehicles').update({ status: 'Rented', current_mileage: formData.startMileage }).eq('id', car.id);
      
      try {
        await supabase.functions.invoke('send-local-sms', {
          body: { customerPhone: formData.customerPhone, customerName: formData.customerName, agreementUrl: pdfUrl }
        });
      } catch (e) { console.warn("SMS Error", e); }

      setStatusMsg('Done! ✅');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("Submission Failed: " + err.message);
      setStatusMsg(''); // Clear status on error
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <h1>Loading...</h1>;
  if (!car) return <h1>Car not found</h1>;

  return (
    <div className="form-container" style={{maxWidth: '700px', margin: '20px auto', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}}>
      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
      <form className="rental-form" onSubmit={handleSubmit}>
        {step === 1 && <RentalStep1 formData={formData} setFormData={setFormData} car={car} pastCustomers={pastCustomers} handleTextChange={handleTextChange} handleFileChange={handleFileChange} nextStep={nextStep} />}
        {step === 2 && <RentalStep2 formData={formData} handleTextChange={handleTextChange} handleFileChange={handleFileChange} prevStep={prevStep} nextStep={nextStep} car={car} totalCost={(formData.rentalDays * (car.daily_rate || 0)).toFixed(2)} />}
        {step === 3 && <RentalStep3 formData={formData} car={car} totalCost={(formData.rentalDays * (car.daily_rate || 0)).toFixed(2)} agreementBoxRef={agreementBoxRef} sigPadRef={sigPad} clearSignature={clearSignature} prevStep={prevStep} submitting={submitting} />}
      </form>
      
      {/* 🆕 NEW: Loading Status Indicator */}
      {submitting && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#333', color: '#fff', padding: '12px 24px', borderRadius: '30px',
          fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 9999
        }}>
          {statusMsg || 'Processing...'}
        </div>
      )}
    </div>
  );
};

export default NewRentalPage;