// supabase/functions/send-local-sms/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// --- text.lk API Details ---
const API_ENDPOINT = "https://app.text.lk/api/v3/sms/send"
const SENDER_ID = "TextLKDemo" // IMPORTANT: Change to your approved Sender ID
// -----------------------------

// --- 💡 NEW: CORS Headers ---
// We need these headers to allow your React app (on localhost)
// to call this function.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allows all origins
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and preflight OPTIONS
}
// -----------------------------

serve(async (req) => {
  // --- 💡 NEW: Handle Preflight OPTIONS request ---
  // The browser sends this "test" request first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  // -----------------------------------------------

  try {
    const { customerPhone, customerName } = await req.json();
    const apiKey = Deno.env.get("LOCAL_SMS_API_KEY");

    const formattedPhone = customerPhone.replace(/^0/, '94');
    const message = `Hi ${customerName}, your rental with SahanRentals is confirmed!`;

    const messageData = {
      recipient: formattedPhone,
      sender_id: SENDER_ID,
      type: "plain",
      message: message
    };

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    const result = await response.json();

    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message || 'Failed to send SMS');
    }

    // --- 💡 NEW: Add CORS headers to the SUCCESS response ---
    return new Response(JSON.stringify({ status: 'success', data: result.data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    
    // --- 💡 NEW: Add CORS headers to the ERROR response ---
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})