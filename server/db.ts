import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/supabase-js';
import * as schema from "@shared/schema";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY must be set. Click the 'Connect to Supabase' button in the top right to set up Supabase.",
  );
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
export const db = drizzle(supabase, { schema });