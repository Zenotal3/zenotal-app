// js/supabase.js - Supabase client (replaces insforge.js)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://npnpaimawwdxqlcvbfur.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbnBhaW1hd3dkeHFsY3ZiZnVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzcxNTMsImV4cCI6MjA5MDg1MzE1M30.oTUKF7oXJAiyuQfxl5qUJQci1baGxRpEu3cZaO8GAhY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
