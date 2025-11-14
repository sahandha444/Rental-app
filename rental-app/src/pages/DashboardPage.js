// File: src/pages/DashboardPage.js

import React, { useState, useEffect } from 'react'; // 1. Import hooks
import VehicleCard from '../components/VehicleCard';
import './DashboardPage.css';

 // 2. Import your database 
import { supabase } from '../supabaseClient'; // Our new Supabase "engine"

const DashboardPage = () => {
  // 3. Create state to hold your cars and loading status
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  // 4. This 'useEffect' hook runs ONCE when the page loads
  useEffect(() => {
    
    // 5. Create an async function to fetch the data
    const fetchVehicles = async () => {
      try {
        // --- THIS IS THE NEW SUPABASE CODE ---
        const { data, error } = await supabase
          .from('vehicles') // The table name
          .select('*');     // Get all columns
        
        if (error) throw error;
        
        setVehicles(data); // 7. Update your state with the real data
        // ----------------------------------------
        
      } catch (error) {
        console.error("Error fetching vehicles: ", error.message);
      } finally {
        setLoading(false); // 8. Set loading to false (all done)
      }
    };

    fetchVehicles(); // 9. Call the function
  }, []); // The empty '[]' means "run this only once"

  // 10. Show a loading message
  if (loading) {
    return <h2 className="dashboard-title">Loading vehicles...</h2>;
  }
  
  // 11. This is your original code, but it now uses the 'vehicles' state
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Vehicle Dashboard</h1>
      <div className="vehicle-grid">
        {vehicles.map(car => (
          <VehicleCard key={car.id} car={car} />
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;