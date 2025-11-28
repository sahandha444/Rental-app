// File: src/pages/ManageRentalsPage.js

import React, { useState, useEffect, useRef } from 'react'; 
import { supabase } from '../supabaseClient';
import PhotoViewerModal from '../components/PhotoViewerModal';
import ReturnRentalModal from '../components/ReturnRentalModal'; 
import './ManageRentalsPage.css';

const ManageRentalsPage = () => {
  // --- STATE ---
  const [loading, setLoading] = useState(true); 
  
  // Modal States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null); 
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [rentalForPhotos, setRentalForPhotos] = useState(null);

  // Data States
  const [rentals, setRentals] = useState([]);
  const rentalsRef = useRef(rentals); 

  // Search & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(5); // Start by showing 5

  // --- Helper Functions ---
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
      updateRentalsState(data);
    } catch (error) {
      console.error("Error fetching rentals:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener
  useEffect(() => {
    fetchRentals(); 
    console.log('Setting up real-time subscription for rentals...');
    const subscription = supabase
      .channel('public:rentals')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rentals' }, (payload) => {
          const newList = [payload.new, ...rentalsRef.current];
          updateRentalsState(newList);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rentals' }, (payload) => {
          const updatedList = rentalsRef.current.map((rental) =>
            rental.id === payload.new.id ? payload.new : rental
          );
          updateRentalsState(updatedList);
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, []); 

  // --- Modal Actions ---
  const openReturnModal = async (rental) => {
    const { data: carData, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', rental.car_id)
      .single();
    if (error) return alert("Could not fetch car details.");
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

  // --- Filter Logic ---
  const pendingRentals = rentals.filter(r => r.status === 'active'); 
  
  // 1. Filter Completed Rentals by Search Term
  const allCompletedRentals = rentals.filter(r => r.status === 'completed');
  const filteredCompleted = allCompletedRentals.filter(r => 
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.car_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Slice for "Show More" functionality
  const visibleCompletedRentals = filteredCompleted.slice(0, visibleCount);

  if (loading) return <div className="rentals-page-container"><h1>Loading rentals...</h1></div>;

  return (
    <div className="rentals-page-container">
      <h1>Manage Rentals</h1>

      {/* --- PENDING RENTALS --- */}
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
                    <button className="end-rental-button" onClick={() => openReturnModal(rental)}>Return Vehicle</button>
                    <a href={rental.agreement_pdf_url} target="_blank" rel="noopener noreferrer" className="view-pdf-button">Agreement</a>
                    <button className="view-photos-button" onClick={() => openPhotoModal(rental)}>Photos</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- COMPLETED RENTALS (With Search & Show More) --- */}
      <div className="rentals-list-container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}>
          <h2>Completed Rentals ({filteredCompleted.length})</h2>
          
          {/* SEARCH BAR */}
          <input 
            type="text" 
            placeholder="Search completed rentals..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(5); // Reset view on search
            }}
            style={{
              padding: '8px 12px', 
              borderRadius: '5px', 
              border: '1px solid #ccc', 
              width: '250px'
            }}
          />
        </div>

        <table className="rentals-table">
          <thead>
            <tr>
              <th>Car</th>
              <th>Customer</th>
              <th>Return Date</th>
              <th>Final Cost</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCompletedRentals.length === 0 ? (
              <tr><td colSpan="5">No rentals found.</td></tr>
            ) : (
              visibleCompletedRentals.map(rental => (
                <tr key={rental.id} className="completed-row">
                  <td>{rental.car_name}</td>
                  <td>{rental.customer_name}</td>
                  <td>{rental.return_date ? new Date(rental.return_date).toLocaleDateString() : '-'}</td>
                  <td>LKR {rental.final_total_cost ? rental.final_total_cost.toFixed(2) : '-'}</td>
                  <td className="actions-cell">
                  {/* View Original Agreement */}
                  <a href={rental.agreement_pdf_url} target="_blank" rel="noopener noreferrer" className="view-pdf-button">
                    Agreement
                  </a>
                  
                  {/* View Invoice */}
                  <a href={rental.return_invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="view-pdf-button">
                    Invoice
                  </a>

                  {/* ✅ NEW BUTTON: Return Doc */}
                  {rental.return_agreement_pdf_url && (
                    <a 
                      href={rental.return_agreement_pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="view-pdf-button"
                    >
                      Return Doc
                    </a>
                  )}

                  <button className="view-photos-button" onClick={() => openPhotoModal(rental)}>
                    Photos
                  </button>
                </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* SHOW MORE BUTTON */}
        {visibleCount < filteredCompleted.length && (
          <div style={{textAlign: 'center', marginTop: '15px'}}>
            <button 
              onClick={() => setVisibleCount(prev => prev + 5)}
              style={{
                padding: '10px 20px', 
                background: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Show More ({filteredCompleted.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {showReturnModal && selectedRental && selectedCar && (
        <ReturnRentalModal rental={selectedRental} car={selectedCar} onClose={closeReturnModal} onSuccess={() => closeReturnModal()} />
      )}
      {showPhotoModal && rentalForPhotos && (
        <PhotoViewerModal rental={rentalForPhotos} onClose={closePhotoModal} />
      )}
    </div>
  );
};

export default ManageRentalsPage;