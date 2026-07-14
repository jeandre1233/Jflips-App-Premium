import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseKey && 
  supabaseUrl !== 'undefined' && 
  supabaseKey !== 'undefined'
);

// Fallback values prevent module-level crashes during build or initialization
const safeUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co';
const safeKey = isSupabaseConfigured ? supabaseKey : 'placeholder-anon-key';

export const supabase = createClient(safeUrl, safeKey);

