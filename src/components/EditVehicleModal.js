// File: src/components/EditVehicleModal.js
import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression'; 
import './ReturnRentalModal.css'; // Reusing the modal CSS for consistency

// --- Helper: Dual Upload Buttons (Internal) ---
const ImageUploadControl = ({ label, onChange }) => {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [fileName, setFileName] = useState('');

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
      onChange(e.target.files[0]);
    }
  };

  const btnStyle = { flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '6px', background: '#f8f9fa', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' };

  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#495057' }}>{label}</label>
      {fileName && <div style={{ fontSize: '12px', color: '#007bff', marginBottom: '5px' }}>📎 New: {fileName}</div>}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" style={btnStyle} onClick={() => cameraInputRef.current.click()}>📷 Camera</button>
        <button type="button" style={btnStyle} onClick={() => galleryInputRef.current.click()}>🖼️ Gallery</button>
      </div>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />
      <input ref={galleryInputRef} type="file" accept="image/jpeg, image/png, image/jpg" style={{ display: 'none' }} onChange={handleFileSelect} />
    </div>
  );
};

// --- Helper: Compression ---
const compressImage = async (file) => {
  if (!file) return null;
  try {
    return await imageCompression(file, { maxSizeMB: 0.6, maxWidthOrHeight: 1280, useWebWorker: true });
  } catch (e) { return file; }
};

const EditVehicleModal = ({ vehicle, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: vehicle.name,
    plate_number: vehicle.plate_number,
    current_mileage: vehicle.current_mileage,
    daily_rate: vehicle.daily_rate,
    extra_km_price: vehicle.extra_km_price,
    extra_hourly_rate: vehicle.extra_hourly_rate,
  });
  const [newPhoto, setNewPhoto] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      let imageUrl = vehicle.imageUrl; // Default to existing

      // 1. If new photo selected, upload it
      if (newPhoto) {
        const compressed = await compressImage(newPhoto);
        const fileName = `${uuidv4()}-${newPhoto.name}`;
        const filePath = `vehicle-photos/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, compressed);
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      }

      // 2. Update DB
      const { error } = await supabase
        .from('vehicles')
        .update({
          name: formData.name,
          plate_number: formData.plate_number,
          current_mileage: parseFloat(formData.current_mileage),
          daily_rate: parseFloat(formData.daily_rate),
          extra_km_price: parseFloat(formData.extra_km_price),
          extra_hourly_rate: parseFloat(formData.extra_hourly_rate),
          imageUrl: imageUrl
        })
        .eq('id', vehicle.id);

      if (error) throw error;

      onSuccess(); // Refresh parent list
      onClose();
    } catch (err) {
      alert("Update failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Vehicle</h2>
        
        <div className="form-group">
          <label>Vehicle Name</label>
          <input type="text" id="name" value={formData.name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Plate Number</label>
          <input type="text" id="plate_number" value={formData.plate_number} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Current Mileage</label>
          <input type="number" id="current_mileage" value={formData.current_mileage} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Daily Rate (LKR)</label>
          <input type="number" id="daily_rate" value={formData.daily_rate} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Extra KM Rate</label>
          <input type="number" id="extra_km_price" value={formData.extra_km_price} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Extra Hourly Rate</label>
          <input type="number" id="extra_hourly_rate" value={formData.extra_hourly_rate} onChange={handleChange} />
        </div>

        <ImageUploadControl label="Update Photo (Optional)" onChange={setNewPhoto} />

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn" disabled={loading}>Cancel</button>
          <button onClick={handleUpdate} className="confirm-btn" disabled={loading}>
            {loading ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditVehicleModal;