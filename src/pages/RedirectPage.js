// File: src/pages/RedirectPage.js (NEW FILE)

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const RedirectPage = () => {
  const { shortId } = useParams(); // Gets the "a7T3nK" from the URL
  const [message, setMessage] = useState('Redirecting, please wait...');

  useEffect(() => {
    // This runs as soon as the page loads
    const fetchLink = async () => {
      if (!shortId) {
        setMessage('Invalid link.');
        return;
      }

      try {
        // 1. Query our new 'short_links' table
        const { data, error } = await supabase
          .from('short_links')
          .select('long_url') // We only need the destination
          .eq('id', shortId)
          .single();

        if (error || !data) {
          throw new Error('Link not found or has expired.');
        }

        // 2. If we find it, redirect the user!
        console.log(`Redirecting to: ${data.long_url}`);
        window.location.replace(data.long_url);

      } catch (error) {
        console.error(error.message);
        setMessage('Error: Link not found.');
      }
    };

    fetchLink();
  }, [shortId]); // Re-run if the shortId changes

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      <h1>{message}</h1>
    </div>
  );
};

export default RedirectPage;