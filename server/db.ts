import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm';
import * as schema from "@shared/schema";

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. Click the 'Connect to Supabase' button in the top right to set up Supabase.",
  );
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
export const db = drizzle(supabase, { schema });