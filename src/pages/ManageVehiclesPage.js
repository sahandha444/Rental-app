import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import './ManageVehiclesPage.css';

const ManageVehiclesPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for the new vehicle form
  const [name, setName] = useState('');
  const [plate, setPlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [extraMileRate, setExtraMileRate] = useState('');
  const [extraHourRate, setExtraHourRate] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch all vehicles when the page loads
  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      // Get ALL vehicles, even inactive ones
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        // --- THIS IS THE FIX ---
        // I changed 'created_at' to 'name', which is a column we know exists.
        .order('name', { ascending: true }); 
        
      if (error) throw error;
      setVehicles(data);
    } catch (error) {
      console.error("Error fetching vehicles:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle file input
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  // --- Create a function to reset all state ---
  const resetForm = () => {
    setName('');
    setPlate('');
    setMileage('');
    setDailyRate('');
    setExtraMileRate('');
    setExtraHourRate('');
    setPhoto(null);
    // This resets the file input DOM element
    const form = document.getElementById('add-vehicle-form');
    if (form) form.reset();
  };

  // Handle the "Add Vehicle" form submit
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!photo) {
      alert("Please select a photo for the vehicle.");
      return;
    }
    setSubmitting(true);
    
    try {
      // 1. Upload the photo
      const fileName = `${uuidv4()}-${photo.name}`;
      const filePath = `vehicle-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, photo);

      if (uploadError) throw uploadError;

      // 2. Get the public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);
      
      const imageUrl = urlData.publicUrl;

      // 3. Insert the new vehicle into the database
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
      fetchVehicles(); // Refresh the list

    } catch (error) {
      console.error("Error adding vehicle:", error.message);
      alert("Failed to add vehicle. The plate number of the vehicle already exists");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle "deleting" (deactivating) a vehicle
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
        
        alert(`Vehicle ${action}d successfully!`);
        fetchVehicles(); // Refresh the list
        
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

          <label htmlFor="photo">Vehicle Photo (for dashboard)</label>
          <input type="file" id="photo" className="form-input" accept="image/*" onChange={handleFileChange} required />

          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Vehicle'}
          </button>
        </form>
      </div>

      <hr className="divider" />

      {/* --- VEHICLE LIST --- */}
      <div className="vehicle-list-container">
        <h2>Existing Vehicles</h2>
        {loading && <p>Loading vehicles...</p>}
        <table className="vehicle-table">
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