// File: src/components/VehicleCard.js

import React from 'react';
import { Link } from 'react-router-dom'; // 1. Import Link
import './VehicleCard.css';

// 2. We are now wrapping the card in a <Link>
// 3. We are also disabling the link if the car is rented
const VehicleCard = ({ car }) => {
  const isRented = car.status === 'Rented';

  return (
    // 4. This <Link> tag is the magic
    // It creates a dynamic link, e.g., "/new-rental/car1"
    <Link 
      to={isRented ? '#' : `/new-rental/${car.id}`} 
      className={`card-link ${isRented ? 'disabled' : ''}`}
    >
      <div className="card">
        <img src={car.imageUrl} alt={car.name} className="card-image" />
        <div className="card-content">
          <h3 className="card-title">{car.name}</h3>
          
          <span 
            className={`card-status ${isRented ? 'status-rented' : 'status-available'}`}
          >
            {car.status}
          </span>

          {/* 5. Add a "call to action" button */}
          <div className="card-action">
            {isRented ? 'Currently Rented' : 'Start New Rental'}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VehicleCard;