import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import './App.css';

// --- Import ALL our pages ---
import DashboardPage from './pages/DashboardPage';
import NewRentalPage from './pages/NewRentalPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage'; 
import ManageVehiclesPage from './pages/ManageVehiclesPage';
import ManageRentalsPage from './pages/ManageRentalsPage'; 
import RedirectPage from './pages/RedirectPage'; 

// --- 1. FIXED: Use the REAL Supabase client ---
import { supabase } from './supabaseClient'; 

// Helper component to close menu on route change
const ScrollToTop = ({ closeMenu }) => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    closeMenu(); // Close menu whenever we change pages
  }, [pathname, closeMenu]);
  return null;
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  // --- No session? Show Login Page ---
  if (!session) {
    return (
      <BrowserRouter>
        <main className="app-container">
          <Routes>
            <Route path="*" element={<LoginPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    );
  }

  // --- Session exists? Show the Full App ---
  return (
    <BrowserRouter>
      <ScrollToTop closeMenu={closeMenu} />
      
      {/* --- NAVBAR --- */}
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/" className="nav-logo" onClick={closeMenu}>
            Sahan's Rentals 🚗
          </Link>

          {/* Hamburger Button */}
          <button className="hamburger-btn" onClick={toggleMenu} aria-label="Toggle menu">
            <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
          </button>

          {/* Desktop Links */}
          <div className="desktop-links">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/manage-vehicles" className="nav-link">Manage Fleet</Link>
            <Link to="/manage-rentals" className="nav-link">Manage Rentals</Link>
            <Link to="/settings" className="nav-link settings-link">Settings</Link>
          </div>
        </div>
      </nav>

      {/* --- MOBILE SLIDING MENU --- */}
      <div 
        className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`} 
        onClick={closeMenu}
      ></div>
      
      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <h3>Menu</h3>
          <button className="close-btn" onClick={closeMenu}>&times;</button>
        </div>
        <Link to="/" className="mobile-link">Dashboard</Link>
        <Link to="/manage-vehicles" className="mobile-link">Manage Fleet</Link>
        <Link to="/manage-rentals" className="mobile-link">Manage Rentals</Link>
        <Link to="/settings" className="mobile-link">Settings</Link>
      </div>

      {/* --- Main Content --- */}
      <main className="app-container">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/new-rental/:carId" element={<NewRentalPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/manage-vehicles" element={<ManageVehiclesPage />} />
          <Route path="/manage-rentals" element={<ManageRentalsPage />} />
          <Route path="/r/:shortId" element={<RedirectPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;