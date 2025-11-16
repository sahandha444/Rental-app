import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './SettingsPage.css'; // We'll create this next

const SettingsPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Supabase function to update the user's password
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('Password updated successfully!');
      setNewPassword(''); // Clear the input
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    
    // 2. Supabase function to sign the user out
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      alert('Error: ' + error.message);
    } else {
      // App.js will detect this and show the LoginPage
      navigate('/login'); 
    }
    setLoading(false);
  };

  return (
    <div className="settings-container">
      {/* --- Change Password Form --- */}
      <form className="settings-form" onSubmit={handleChangePassword}>
        <h2>Change Password</h2>
        
        <label htmlFor="newPassword">New Password</label>
        <input
          id="newPassword"
          className="settings-input"
          type="password"
          placeholder="••••••••"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        
        <button className="settings-button" type="submit" disabled={loading || newPassword.length < 6}>
          {loading ? 'Saving...' : 'Save New Password'}
        </button>
        {newPassword.length > 0 && newPassword.length < 6 && (
          <p className="password-warning">Password must be at least 6 characters.</p>
        )}
      </form>

      <hr className="divider" />

      {/* --- Logout Button --- */}
      <button 
        className="logout-button" 
        onClick={handleLogout} 
        disabled={loading}
      >
        {loading ? 'Logging out...' : 'Log Out'}
      </button>
    </div>
  );
};

export default SettingsPage;