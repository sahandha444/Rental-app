import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import './App.css';

// --- Import Pages ---
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import NewRentalPage from './pages/NewRentalPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage'; 
import ManageVehiclesPage from './pages/ManageVehiclesPage';
import ManageRentalsPage from './pages/ManageRentalsPage'; 
import RedirectPage from './pages/RedirectPage'; 
import YaluToursLogo from './assets/yalu-tours-logo.png';
import { supabase } from './supabaseClient'; 

// Helper component
const ScrollToTop = ({ closeMenu }) => { 
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    closeMenu(); 
  }, [pathname]); 
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

  return (
    <BrowserRouter>
      {/* Helper to scroll top */}
      <ScrollToTop closeMenu={closeMenu} />
      
      {/* --- CONDITIONAL LAYOUT: Only show Navbar if Logged In --- */}
      {session && (
        <>
          {/* --- NAVBAR --- */}
          <nav className="navbar">
            <div className="navbar-content">
              {/* Updated Logo Section with Classes */}
              <NavLink to="/" className="nav-logo" onClick={closeMenu}>  
                <img 
                  src={YaluToursLogo} 
                  alt="Yalu Rents" 
                  className="logo-image" 
                />
                <span className="brand-title">
                  Owner's Portal
                </span>
              </NavLink>

              <button className="hamburger-btn" onClick={toggleMenu} aria-label="Toggle menu">
                {/* ... keep hamburger spans ... */}
                <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
                <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
                <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
              </button>

              <div className="desktop-links">
                <NavLink to="/" className="nav-link" end>Home</NavLink>
                <NavLink to="/vehicle-dashboard" className="nav-link">Vehicle Board</NavLink>
                <NavLink to="/manage-rentals" className="nav-link">Manage Rentals</NavLink>
                <NavLink to="/manage-vehicles" className="nav-link">Manage Fleet</NavLink>
                <NavLink to="/settings" className="nav-link">Settings</NavLink>
              </div>
            </div>
          </nav>

          {/* Mobile Menu Overlay */}
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
        </>
      )}

      {/* --- MAIN CONTENT & ROUTING --- */}
      <main className="app-container">
        <Routes>
          
          {/* 🟢 PUBLIC ROUTES (Accessible by ANYONE, e.g. Customers via SMS) */}
          <Route path="/r/:shortId" element={<RedirectPage />} />


          {/* 🔒 PROTECTED ROUTES (Require Login) */}
          {!session ? (
            // If NOT logged in, any other link goes to Login
            <Route path="*" element={<LoginPage />} />
          ) : (
            // If Logged In, allow access to App
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/vehicle-dashboard" element={<DashboardPage />} />
              <Route path="/new-rental/:carId" element={<NewRentalPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/manage-vehicles" element={<ManageVehiclesPage />} />
              <Route path="/manage-rentals" element={<ManageRentalsPage />} />
              
              {/* Fallback for logged in users */}
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}

        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;