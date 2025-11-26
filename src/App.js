import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import './App.css';

// --- Import ALL our pages ---
import HomePage from './pages/HomePage'; // <--- NEW IMPORT
import DashboardPage from './pages/DashboardPage';
import NewRentalPage from './pages/NewRentalPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage'; 
import ManageVehiclesPage from './pages/ManageVehiclesPage';
import ManageRentalsPage from './pages/ManageRentalsPage'; 
import RedirectPage from './pages/RedirectPage'; 
import YaluToursLogo from './assets/yalu-tours-logo.png';
import { supabase } from './supabaseClient'; 

// Helper component to close menu on route change
const ScrollToTop = ({ closeMenu }) => { 
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    closeMenu(); 
  }, [pathname]); // <--- FIXED: Removed 'closeMenu' from here
  return null;
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  if (loading) return <div className="loading-spinner">Loading...</div>;

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

  return (
    <BrowserRouter>
      <ScrollToTop closeMenu={closeMenu} />
      
      {/* --- NAVBAR --- */}
      <nav className="navbar">
        <div className="navbar-content">
          {/* Logo links to Home Menu */}
          <NavLink to="/" className="nav-logo" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>  
            <img 
              src={YaluToursLogo} 
              alt="Yalu Rents Logo" 
              style={{ height: '58px', maxWidth: '180px' }} 
            />
            <span style={{ 
              fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary-color)', paddingLeft: '15px',
              '@media (max-width: 600px)': { display: 'none' }
            }}>
              Owner's Portal
            </span>
          </NavLink>

          <button className="hamburger-btn" onClick={toggleMenu} aria-label="Toggle menu">
            <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
          </button>

          {/* Desktop Links */}
          <div className="desktop-links">
            <NavLink to="/" className="nav-link" end>Home</NavLink> {/* Renamed to Home */}
            <NavLink to="/vehicle-dashboard" className="nav-link">Vehicle Board</NavLink> {/* Renamed old Dashboard */}
            <NavLink to="/manage-rentals" className="nav-link">Manage Rentals</NavLink>
            <NavLink to="/manage-vehicles" className="nav-link">Manage Fleet</NavLink>
          </div>
        </div>
      </nav>

      <div className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={closeMenu}></div>
      
      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <h3>Menu</h3>
          <button className="close-btn" onClick={closeMenu}>&times;</button>
        </div>
        <NavLink to="/" className="mobile-link" onClick={closeMenu} end>Home</NavLink>
        <NavLink to="/vehicle-dashboard" className="mobile-link" onClick={closeMenu}>Vehicle Board</NavLink>
        <NavLink to="/manage-rentals" className="mobile-link" onClick={closeMenu}>Manage Rentals</NavLink>
        <NavLink to="/manage-vehicles" className="mobile-link" onClick={closeMenu}>Manage Fleet</NavLink>
        <NavLink to="/settings" className="mobile-link" onClick={closeMenu}>Settings</NavLink>
      </div>

      {/* --- Main Content --- */}
      <main className="app-container">
        <Routes>
          {/* 1. New Home Page at Root */}
          <Route path="/" element={<HomePage />} />
          
          {/* 2. Old Dashboard moved to new route */}
          <Route path="/vehicle-dashboard" element={<DashboardPage />} />
          
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