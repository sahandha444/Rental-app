// File: src/pages/NewRentalPage.js

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './NewRentalPage.css';

// --- NEW IMPORTS ---
import { supabase } from '../supabaseClient'; // Our new Supabase "engine"
import { v4 as uuidv4 } from 'uuid'; // For unique file names
import SignatureCanvas from 'react-signature-canvas'; // The signature pad!
// --------------------

const NewRentalPage = () => {
  const { carId } = useParams(); 
  const navigate = useNavigate(); 
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // --- NEW STATE FOR FILES & SIGNATURE ---
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [carPhoto, setCarPhoto] = useState(null);
  const sigPad = useRef(null); // A ref to control the signature pad
  // ---------------------------------------
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerID: '',
    customerPhone: ''
  });

  // Fetch car details (no change from before)
  // Fetch car details
  useEffect(() => {
    const fetchCarDetails = async () => {
      setLoading(true);
      try {
        // --- NEW SUPABASE CODE ---
        const { data, error } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', carId) // Find the row where 'id' matches carId
          .single();       // We only expect one car
          
        if (error) throw error;

        if (data) {
          setCar(data);
        } else {
          console.error("No such car!");
        }
        // -------------------------
      } catch (err) {
        console.error("Error fetching car", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCarDetails();
  }, [carId]);

  // Handle simple form text changes (no change)
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prevState => ({ ...prevState, [id]: value }));
  };

  // --- NEW: Handle file input changes ---
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      if (e.target.id === 'licensePhoto') {
        setLicensePhoto(e.target.files[0]);
      } else if (e.target.id === 'carPhoto') {
        setCarPhoto(e.target.files[0]);
      }
    }
  };
  // -------------------------------------
  
  // --- NEW: Clear the signature pad ---
  const clearSignature = () => {
    sigPad.current.clear();
  };
  // ----------------------------------

  // --- UPDATED: handleSubmit function ---
 // File: src/pages/NewRentalPage.js

  // ... (keep all your other code like imports, state, useEffect, etc.) ...


  // Helper function to convert DataURL (from signature) to a File
  function dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  // --- THIS IS THE CORRECTED handleSubmit FUNCTION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!licensePhoto || !carPhoto || sigPad.current.isEmpty()) {
      alert("Please fill all fields, upload both photos, and provide a signature.");
      return;
    }
    
    setSubmitting(true);
    
    try {
      // --- 1. Upload Files (This part was working, no changes) ---
      const uploadFile = async (file, folder) => {
        const fileName = `${uuidv4()}-${file.name}`;
        const filePath = `${folder}/${fileName}`; 

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);
        
        return data.publicUrl;
      };

      const licensePhotoURL = await uploadFile(licensePhoto, 'licenses');
      const carPhotoURL = await uploadFile(carPhoto, 'car-conditions');
      const signatureDataURL = sigPad.current.toDataURL('image/png');
      const signatureFile = dataURLtoFile(signatureDataURL, `${uuidv4()}-signature.png`);
      const signatureURL = await uploadFile(signatureFile, 'signatures');

      // --- 3. Save ALL data to Supabase 'rentals' table ---
      // --- THIS IS THE CORRECTED PART ---
      const { error: insertError } = await supabase
        .from('rentals') // Your table name
        .insert([
          { 
            // FIX 1: Use 'car_id' (snake_case) to match your DB table
            // FIX 2: Use 'parseInt(carId)' to convert the string from the URL to a number
            car_id: parseInt(carId, 10), 
            
            car_name: car.name,

            // FIX 3: Make sure all these keys match your DB column names
            customer_name: formData.customerName,
            customer_id: formData.customerID,
            customer_phone: formData.customerPhone,
            rental_start_date: new Date(),
            status: 'active',
            license_photo_url: licensePhotoURL,
            car_photo_url: carPhotoURL,
            signature_url: signatureURL
          }
        ]);
        
      if (insertError) {
        // This will show you the *exact* database error in the console (F12)
        console.error('Supabase insert error:', insertError.message);
        throw insertError; 
      }
      
      // --- 4. Update Car Status in 'vehicles' table ---
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ status: 'Rented' })
        // FIX 4: Also use parseInt() here to be safe
        .eq('id', parseInt(carId, 10)); 
      
      if (updateError) {
        console.error('Supabase update error:', updateError.message);
        throw updateError;
      }
      
      // --- 5. Go Home ---
      navigate('/');
      
    } catch (error) {
      // This is the alert you were seeing
      console.error("Full error details:", error);
      alert("Failed to create rental. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

// ... (keep the rest of your file, the return() statement, etc.) ...
  // --------------------------------------

  if (loading) return <h1>Loading car details...</h1>;
  if (!car) return <h1>Car not found.</h1>;

  // --- UPDATED: The Form (JSX) ---
  return (
    <div className="form-container">
      <h1>New Rental</h1>
      <p>You are renting: <strong>{car.name}</strong></p>

      <form className="rental-form" onSubmit={handleSubmit}>
        {/* Customer Info */}
        <label htmlFor="customerName">Customer Name</label>
        <input type="text" id="customerName" className="form-input" value={formData.customerName} onChange={handleChange} required />
        
        <label htmlFor="customerID">Customer ID (NIC)</label>
        <input type="text" id="customerID" className="form-input" value={formData.customerID} onChange={handleChange} required />
        
        <label htmlFor="customerPhone">Customer Phone</label>
        <input type="tel" id="customerPhone" className="form-input" value={formData.customerPhone} onChange={handleChange} required />
        
        <hr className="form-divider" />

        {/* --- NEW: File Inputs --- */}
        <label htmlFor="licensePhoto">Customer's License Photo</label>
        <input type="file" id="licensePhoto" className="form-input" accept="image/*" onChange={handleFileChange} required />
        
        <label htmlFor="carPhoto">Car Condition Photo (Before)</label>
        <input type="file" id="carPhoto" className="form-input" accept="image/*" onChange={handleFileChange} required />
        
        <hr className="form-divider" />

        {/* --- NEW: Signature Pad --- */}
        <label>Customer Signature</label>
        <div className="signature-box">
          <SignatureCanvas 
            ref={sigPad}
            penColor='black'
            canvasProps={{ className: 'sig-canvas' }} 
          />
        </div>
        <button type="button" className="clear-button" onClick={clearSignature}>
          Clear Signature
        </button>
        {/* ------------------------ */}

        <button type="submit" className="submit-button" disabled={submitting}>
          {submitting ? 'Saving Rental...' : 'Complete Rental'}
        </button>
      </form>
    </div>
  );
};

export default NewRentalPage;