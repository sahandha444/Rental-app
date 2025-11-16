import React from 'react';
import { Link } from 'react-router-dom';
import './VehicleCard.css';

const VehicleCard = ({ car }) => {
  // --- This is the safety check ---
  // If the car object is null or undefined, don't try to render anything.
  if (!car) {
    return null; // Stop the crash!
  }
  // ------------------------------

  const isRented = car.status === 'Rented';
  
  // Use fallbacks for every single piece of data
  const imageUrl = car.imageUrl || 'https://via.placeholder.com/300x180.png?text=No+Image';
  const name = car.name || 'Unnamed Vehicle';
  const dailyRate = car.daily_rate;
  const status = car.status || 'Unknown';

  return (
    <Link 
      to={isRented ? '#' : `/new-rental/${car.id}`} 
      className={`card-link ${isRented ? 'disabled' : ''}`}
    >
      <div className="card">
        <img src={imageUrl} alt={name} className="card-image" />
        <div className="card-content">
          <h3 className="card-title">{name}</h3>
          
          {/* Safer price check */}
          <p className="card-price">
            {dailyRate ? `LKR ${dailyRate} / day` : 'Price not set'}
          </p>
          
          <span 
            className={`card-status ${isRented ? 'status-rented' : 'status-available'}`}
          >
            {status}
          </span>

          <div className="card-action">
            {isRented ? 'Currently Rented' : 'Start New Rental'}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VehicleCard;