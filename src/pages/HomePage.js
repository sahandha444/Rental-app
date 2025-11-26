// File: src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; // We will add styles below

const HomePage = () => {
  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Welcome, Owner 👋</h1>
        <p>What would you like to do today?</p>
      </div>

      <div className="home-grid">
        {/* 1. Vehicle Dashboard (Old Home) */}
        <Link to="/vehicle-dashboard" className="home-card">
          <div className="icon">🚗</div>
          <h3>Vehicle Dashboard</h3>
          <p>View active cars and start rentals.</p>
        </Link>

        {/* 2. Manage Fleet */}
        <Link to="/manage-vehicles" className="home-card">
          <div className="icon">🚙</div>
          <h3>Manage Fleet</h3>
          <p>Add, edit, or remove vehicles.</p>
        </Link>

        {/* 3. Manage Rentals */}
        <Link to="/manage-rentals" className="home-card">
          <div className="icon">📝</div>
          <h3>Manage Rentals</h3>
          <p>View history, agreements, and invoices.</p>
        </Link>

        {/* 4. Settings */}
        <Link to="/settings" className="home-card">
          <div className="icon">⚙️</div>
          <h3>Settings</h3>
          <p>App configuration and preferences.</p>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;