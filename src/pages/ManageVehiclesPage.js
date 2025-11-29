// File: src/pages/ManageVehiclesPage.js

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression'; 
import './ManageVehiclesPage.css';

// --- 🛠️ HELPER: DUAL UPLOAD BUTTONS ---
const ImageUploadControl = ({ id, label, onChange }) => {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [fileName, setFileName] = useState('');

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
      // Pass event back to parent
      const syntheticEvent = {
        target: { id: id, files: e.target.files }
      };
      onChange(syntheticEvent);
    }
  };

  const btnStyle = {
    flex: 1,
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    background: '#f8f9fa',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px'
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#495057' }}>
        {label}
      </label>
      
      {fileName && (
        <div style={{ fontSize: '12px', color: '#007bff', marginBottom: '8px', fontWeight: 'bold' }}>
          📎 Selected: {fileName}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" style={btnStyle} onClick={() => cameraInputRef.current.click()}>
          📷 Camera
        </button>
        <button type="button" style={btnStyle} onClick={() => galleryInputRef.current.click()}>
          🖼️ Gallery
        </button>
      </div>

      {/* Hidden Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment" // Force Camera
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg, image/png, image/jpg" // Force Gallery/File Picker
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </div>
  );
};

// --- COMPRESSION HELPER ---
const compressImage = async (file) => {
  if (!file) return null;
  const options = {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    initialQuality: 0.7,
  };
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.warn("Compression skipped:", error);
    return file; 
  }
};

const ManageVehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [extraMileRate, setExtraMileRate] = useState('');
  const [extraHourRate, setExtraHourRate] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Key to force-reset the upload component after submit
  const [formKey, setFormKey] = useState(0);

  // Fetch all vehicles
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('name', { ascending: true }); 
        
      if (error) throw error;
      setVehicles(data);
    } catch (error) {
      console.error("Error fetching vehicles:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setName('');
    setPlate('');
    setMileage('');
    setDailyRate('');
    setExtraMileRate('');
    setExtraHourRate('');
    setPhoto(null);
    setFormKey(prev => prev + 1); // This resets the ImageUploadControl text
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!photo) {
      alert("Please select a photo for the vehicle.");
      return;
    }
    setSubmitting(true);
    
    try {
      // 1. Compress Image
      const compressedPhoto = await compressImage(photo);

      // 2. Upload the photo
      const fileName = `${uuidv4()}-${photo.name}`;
      const filePath = `vehicle-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, compressedPhoto);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);
      
      const imageUrl = urlData.publicUrl;

      // 3. Insert into DB
      const { error: insertError } = await supabase
        .from('vehicles')
        .insert([
          {
            name: name,
            plate_number: plate,
            current_mileage: parseFloat(mileage),
            daily_rate: parseFloat(dailyRate),
            extra_km_price: parseFloat(extraMileRate),
            extra_hourly_rate: parseFloat(extraHourRate),
            imageUrl: imageUrl, 
            status: 'Available', 
            is_active: true
          }
        ]);
        
      if (insertError) throw insertError;
      
      alert('Vehicle added successfully!');
      resetForm();
      fetchVehicles(); 

    } catch (error) {
      console.error("Error adding vehicle:", error.message);
      alert("Failed to add vehicle. The plate number might already exist.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'deactivate';
    
    if (window.confirm(`Are you sure you want to ${action} this vehicle?`)) {
      try {
        const { error } = await supabase
          .from('vehicles')
          .update({ is_active: newStatus })
          .eq('id', id);
          
        if (error) throw error;
        fetchVehicles(); 
      } catch (error) {
        console.error(`Error ${action}ing vehicle:`, error.message);
      }
    }
  };

  return (
    <div className="manage-vehicles-container">
      {/* --- ADD VEHICLE FORM --- */}
      <div className="form-container">
        <h1>Manage Fleet</h1>
        
        <form id="add-vehicle-form" className="rental-form" onSubmit={handleAddVehicle}>
          <h2>Add New Vehicle</h2>
          
          <label htmlFor="name">Vehicle Name (e.g., "Toyota Aqua")</label>
          <input type="text" id="name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
          
          <label htmlFor="plate">Plate Number</label>
          <input type="text" id="plate" className="form-input" value={plate} onChange={(e) => setPlate(e.target.value)} required />
          
          <label htmlFor="mileage">Current Mileage (km)</label>
          <input type="number" id="mileage" className="form-input" value={mileage} onChange={(e) => setMileage(e.target.value)} required />
          
          <label htmlFor="dailyRate">Daily Rate (LKR)</label>
          <input type="number" step="0.01" id="dailyRate" className="form-input" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} required />
          
          <label htmlFor="extraMileRate">Extra Mileage Rate (LKR per km)</label>
          <input type="number" step="0.01" id="extraMileRate" className="form-input" value={extraMileRate} onChange={(e) => setExtraMileRate(e.target.value)} required />
          
          <label htmlFor="extraHourRate">Extra Hourly Rate (LKR per hour)</label>
          <input type="number" step="0.01" id="extraHourRate" className="form-input" value={extraHourRate} onChange={(e) => setExtraHourRate(e.target.value)} required />

          {/* 🆕 UPDATED: Dual Camera/Gallery Buttons */}
          <ImageUploadControl 
            key={formKey} // Force reset on submit
            id="photo" 
            label="Vehicle Photo (for dashboard)" 
            onChange={handleFileChange} 
          />

          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Vehicle'}
          </button>
        </form>
      </div>

      <hr className="divider" />

      {/* --- VEHICLE LIST --- */}
      <div className="vehicles-list-container">
        <h2>Existing Vehicles</h2>
        {loading && <p>Loading vehicles...</p>}
        <table className="vehicles-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Plate No.</th>
              <th>Status</th>
              <th>Active?</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className={!vehicle.is_active ? 'inactive' : ''}>
                <td>{vehicle.name}</td>
                <td>{vehicle.plate_number}</td>
                <td>{vehicle.status}</td>
                <td>{vehicle.is_active ? 'Yes' : 'No'}</td>
                <td>
                  <button 
                    className={`toggle-button ${vehicle.is_active ? 'deactivate' : 'activate'}`}
                    onClick={() => handleToggleActive(vehicle.id, vehicle.is_active)}
                  >
                    {vehicle.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageVehiclesPage;