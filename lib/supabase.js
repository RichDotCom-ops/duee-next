import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://plbhhmhgkbqvdbaatabv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uFG9QWwS-UkHq-0GAr32bw_SP28c71r';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
