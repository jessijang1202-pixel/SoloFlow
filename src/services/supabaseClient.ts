import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://nyoylqmvhfvuxtpousok.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55b3lscW12aGZ2dXh0cG91c29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTU0NTUsImV4cCI6MjA5OTU3MTQ1NX0.WUIvTZ90TvaJ5DA07oSban8I-7yM2FgyfKZXN6DXyJ0';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.info('Supabase environment variables missing. Using hardcoded fallback client.');
}

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const supabase = isValidUrl(supabaseUrl) && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
