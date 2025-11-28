// File: supabase/functions/send-local-sms/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TEXTLK_API_ENDPOINT = "https://app.text.lk/api/v3/sms/send";
const SENDER_ID = "Yalu Tours"; // ⚠️ Change if needed

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Get Data
    const { customerPhone, customerName, link, type } = await req.json();

    const textLkApiKey = Deno.env.get("LOCAL_SMS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!textLkApiKey || !supabaseUrl || !serviceRoleKey) throw new Error("Missing env vars.");
    if (!customerPhone || !customerName || !link) throw new Error("Missing data.");

    // 2. Create Short Link (Matches your 'id' and 'long_url' schema)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    let finalLinkToSend = link;
    const shortId = Math.random().toString(36).substring(2, 8);
    const siteUrl = req.headers.get('origin');

    if (siteUrl) {
      const { error } = await supabaseAdmin.from('short_links').insert({
        id: shortId,      // Your column: id
        long_url: link    // Your column: long_url
      });

      if (!error) {
        finalLinkToSend = `${siteUrl}/r/${shortId}`;
      } else {
        console.error("Shortener Error:", error.message);
      }
    }

    // 3. Construct Message
    const formattedPhone = customerPhone.replace(/^0/, '94');
    let message = "";

    if (type === 'return') {
      message = `Hi ${customerName}, thanks for riding with Yalu Tours! Here is your invoice: ${finalLinkToSend}`;
    } else {
      message = `Hi ${customerName}, your rental is confirmed! Agreement: ${finalLinkToSend}`;
    }

    // 4. Send SMS
    const textLkResponse = await fetch(TEXTLK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${textLkApiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        recipient: formattedPhone,
        sender_id: SENDER_ID,
        type: "plain",
        message: message
      })
    });

    const result = await textLkResponse.json();
    if (!textLkResponse.ok || result.status !== 'success') {
      throw new Error(result.message || 'Failed to send SMS');
    }

    return new Response(JSON.stringify({ status: 'success', data: result.data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});