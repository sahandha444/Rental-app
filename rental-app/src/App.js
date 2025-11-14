// File: src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './App.css'; // ⬅️ This imports your CSS file!

// --- Import your pages ---
import DashboardPage from './pages/DashboardPage';
import NewRentalPage from './pages/NewRentalPage';

function App() {
  return (
    <BrowserRouter>
      {/* --- This is your Navbar from App.css --- */}
      <nav className="navbar">
        <Link to="/" className="nav-logo">
          Sahan's Rental App
        </Link>
      </nav>

      {/* --- This is your main content container from App.css --- */}
      <main className="app-container">
        <Routes>
          {/* Route 1: The Home Page (Dashboard) */}
          <Route 
            path="/" 
            element={<DashboardPage />} 
          />

          {/* Route 2: The New Rental Page */}
          {/* The ":carId" is a variable. It will be "car1", "car2", etc. */}
          <Route 
            path="/new-rental/:carId" 
            element={<NewRentalPage />} 
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;