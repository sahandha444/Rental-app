import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
// Changed Link to NavLink in the import ^^^^^^^
import './App.css';

// --- Import ALL our pages ---
import DashboardPage from './pages/DashboardPage';
import NewRentalPage from './pages/NewRentalPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage'; 
import ManageVehiclesPage from './pages/ManageVehiclesPage';
import ManageRentalsPage from './pages/ManageRentalsPage'; 
import RedirectPage from './pages/RedirectPage'; 
import YaluToursLogo from './assets/yalu-tours-logo.png';

// --- 1. FIXED: Use the REAL Supabase client ---
import { supabase } from './supabaseClient'; 

// Helper component to close menu on route change and scroll to top
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
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
      {/* PASS closeMenu HERE */}
      <ScrollToTop closeMenu={closeMenu} /> 
      
      {/* --- NAVBAR --- */}
      <nav className="navbar">
        <div className="navbar-content">
          <NavLink to="/" className="nav-logo" onClick={closeMenu} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>  
            {/* Logo Image */}
            <img 
              src={YaluToursLogo} 
              alt="Yalu Rents Logo" 
              // Increased height and max width
              style={{ height: '58px', maxWidth: '180px' }} 
            />

            {/* Title Text (Styling for Branding Polish) */}
            <span style={{ 
              fontSize: '1.25rem',
              fontWeight: '700', 
              color: 'var(--primary-color)', // Using primary color for branding
              paddingLeft: '15px',
              '@media (max-width: 600px)': { display: 'none' }
            }}>
              Owner's Portal
            </span>
          </NavLink>

          {/* Hamburger Button */}
          <button className="hamburger-btn" onClick={toggleMenu} aria-label="Toggle menu">
            <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
            <span className={`bar ${isMenuOpen ? 'open' : ''}`}></span>
          </button>

          {/* Desktop Links (Now uses NavLink) */}
          <div className="desktop-links">
            <NavLink to="/" className="nav-link">Dashboard</NavLink>
            <NavLink to="/manage-vehicles" className="nav-link">Manage Fleet</NavLink>
            <NavLink to="/manage-rentals" className="nav-link">Manage Rentals</NavLink>
            <NavLink to="/settings" className="nav-link">Settings</NavLink>
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
        {/* Mobile Links (Using NavLink and onClick={closeMenu} for immediate visual feedback) */}
        <NavLink to="/" className="mobile-link" onClick={closeMenu}>Dashboard</NavLink>
        <NavLink to="/manage-vehicles" className="mobile-link" onClick={closeMenu}>Manage Fleet</NavLink>
        <NavLink to="/manage-rentals" className="mobile-link" onClick={closeMenu}>Manage Rentals</NavLink>
        <NavLink to="/settings" className="mobile-link" onClick={closeMenu}>Settings</NavLink>
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