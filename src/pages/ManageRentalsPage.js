// File: src/pages/ManageRentalsPage.js

import React, { useState, useEffect, useRef } from 'react'; // 1. Import useRef
import { supabase } from '../supabaseClient';
import PhotoViewerModal from '../components/PhotoViewerModal';
import ReturnRentalModal from '../components/ReturnRentalModal'; // Import the new modal
import './ManageRentalsPage.css';

const ManageRentalsPage = () => {
  // --- STATE AND REF INITIALIZATION (MUST be inside the component) ---
  const [loading, setLoading] = useState(true); 
  
  // Modal State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null); // New state for car details
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [rentalForPhotos, setRentalForPhotos] = useState(null);

  // State and Ref for Real-Time Updates
  const [rentals, setRentals] = useState([]);
  const rentalsRef = useRef(rentals); // Fixes 'rentalsRef is not defined'

  // --- Helper Functions ---
  
  // A helper function to force the state to match the ref, causing a re-render
  const updateRentalsState = (newRentals) => {
    rentalsRef.current = newRentals;
    setRentals(newRentals);
  };
  
  const fetchRentals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select('*')
        .order('rental_start_date', { ascending: false }); 
        
      if (error) throw error;
      
      // Update the Ref and the State with the initial list
      updateRentalsState(data);

    } catch (error) {
      console.error("Error fetching rentals:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch rentals on load AND listen for real-time changes
  useEffect(() => {
    // 1. Fetch the initial list of rentals
    fetchRentals(); 

    // 2. Set up the real-time listener (uses ref to avoid stale state)
    console.log('Setting up real-time subscription for rentals...');

    const subscription = supabase
      .channel('public:rentals')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rentals' },
        (payload) => {
          // INSERT: Add to the front of the list
          console.log('New rental detected!', payload.new);
          const newList = [payload.new, ...rentalsRef.current];
          updateRentalsState(newList);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rentals' },
        (payload) => {
          // UPDATE: Replace the old version of the rental with the new one
          console.log('Rental updated!', payload.new);
          const updatedList = rentalsRef.current.map((rental) =>
            rental.id === payload.new.id ? payload.new : rental
          );
          updateRentalsState(updatedList);
        }
      )
      .subscribe();

    // 3. Cleanup function: This runs when you leave the page
    return () => {
      console.log('Removing real-time subscription.');
      supabase.removeChannel(subscription);
    };
  }, []); 

  // --- Modal Functions ---
  const openReturnModal = async (rental) => {
    // We need car details (daily rate, extra mileage rate) for calculations
    const { data: carData, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', rental.car_id)
      .single();
      
    if (error) {
      console.error("Error fetching car details:", error);
      // Use a simple alert for now or a better UI notification if available
      console.error("Could not fetch car details. Please try again.");
      return;
    }

    setSelectedRental(rental);
    setSelectedCar(carData);
    setShowReturnModal(true);
  };

  const closeReturnModal = () => {
    setSelectedRental(null);
    setSelectedCar(null);
    setShowReturnModal(false);
  };

  const openPhotoModal = (rental) => {
    setRentalForPhotos(rental);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setRentalForPhotos(null);
    setShowPhotoModal(false);
  };

  // --- Filtering for JSX ---
  const pendingRentals = rentals.filter(r => r.status === 'active'); 
  const completedRentals = rentals.filter(r => r.status === 'completed');

  if (loading) {
    return <div className="rentals-page-container"><h1>Loading rentals...</h1></div>;
  }

  return (
    <div className="rentals-page-container">
      <h1>Manage Rentals</h1>

      {/* --- PENDING RENTALS LIST --- */}
      <div className="rentals-list-container">
        <h2>Pending Rentals ({pendingRentals.length})</h2>
        <table className="rentals-table">
          <thead>
            <tr>
              <th>Car</th>
              <th>Customer</th>
              <th>Start Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingRentals.length === 0 ? (
              <tr><td colSpan="4">No pending rentals.</td></tr>
            ) : (
              pendingRentals.map(rental => (
                <tr key={rental.id}>
                  <td>{rental.car_name}</td>
                  <td>{rental.customer_name}</td>
                  <td>{new Date(rental.rental_start_date).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button 
                      className="end-rental-button"
                      onClick={() => openReturnModal(rental)}
                    >
                      Return Vehicle
                    </button>
                    <a 
                      href={rental.agreement_pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="view-pdf-button"
                    >
                      Agreement
                    </a>
                    {/* --- ADD THIS BUTTON --- */}
                    <button 
                      className="view-photos-button" 
                      onClick={() => openPhotoModal(rental)}
                    >
                      Photos
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- COMPLETED RENTALS LIST --- */}
      <div className="rentals-list-container">
        <h2>Completed Rentals ({completedRentals.length})</h2>
        <table className="rentals-table">
          <thead>
            <tr>
              <th>Car</th>
              <th>Customer</th>
              <th>Return Date</th>
              <th>Final Cost</th>
              <th>Actions</th> {/* <-- NEW HEADER */}
            </tr>
          </thead>
          <tbody>
            {completedRentals.length === 0 ? (
              <tr><td colSpan="5">No completed rentals yet.</td></tr> /* <-- Updated colSpan to 5 */
            ) : (
              completedRentals.map(rental => (
                <tr key={rental.id} className="completed-row">
                  <td>{rental.car_name}</td>
                  <td>{rental.customer_name}</td>
                  <td>{rental.return_date ? new Date(rental.return_date).toLocaleDateString() : '-'}</td>
                  <td>LKR {rental.final_total_cost ? rental.final_total_cost.toFixed(2) : '-'}</td>
                  
                  <td className="actions-cell">
                    <a 
                      href={rental.agreement_pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="view-pdf-button"
                    >
                      Agreement
                    </a>
                    <a 
                      href={rental.return_invoice_pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="view-pdf-button"
                    >
                      Invoice
                    </a>
                    {/* --- ADD THIS BUTTON --- */}
                    <button 
                      className="view-photos-button" 
                      onClick={() => openPhotoModal(rental)}
                    >
                      Photos
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- RETURN MODAL --- */}
      {showReturnModal && selectedRental && selectedCar && (
        <ReturnRentalModal 
          rental={selectedRental}
          car={selectedCar}
          onClose={closeReturnModal}
          onSuccess={() => {
            closeReturnModal();
          }}
        />
      )}

      {/* --- ADD THIS NEW MODAL --- */}
      {showPhotoModal && rentalForPhotos && (
        <PhotoViewerModal
          rental={rentalForPhotos}
          onClose={closePhotoModal}
        />
      )}
      
    </div>
  );
};

export default ManageRentalsPage;