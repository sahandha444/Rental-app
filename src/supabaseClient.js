import { createClient } from '@supabase/supabase-js'

// ⬇️ PASTE YOUR PROJECT URL HERE
const supabaseUrl = 'https://njcsowtreglkklqzkzbg.supabase.co'

// ⬇️ PASTE YOUR 'anon' (PUBLIC) KEY HERE
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qY3Nvd3RyZWdsa2tscXpremJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTY1MDgsImV4cCI6MjA3ODYzMjUwOH0.OhTMiPmJKjjAROgrLycqpJIP3F85HFNh7J6lGJmaB-4'

export const supabase = createClient(supabaseUrl, supabaseKey)