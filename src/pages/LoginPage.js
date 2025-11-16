import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './LoginPage.css'; // We'll create this file next

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // This is the Supabase function to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      // The login was successful!
      // App.js will detect this and redirect us.
      // We don't need to do anything else here.
      console.log('Logged in user:', data.user);
    }
    setLoading(false);
  };
  
  // NOTE: We don't have a "Sign Up" button.
  // You will need to create the owner's user account
  // *manually* in the Supabase dashboard (Auth > Users > Add user)
  // for this login form to work.

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h1>Owner Login</h1>
        
        <label htmlFor="email">Email</label>
        <input
          id="email"
          className="login-input"
          type="email"
          placeholder="your-email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <label htmlFor="password">Password</label>
        <input
          id="password"
          className="login-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <button className="login-button" type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;