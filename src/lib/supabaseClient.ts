/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Supabase Client Setup
 *
 * This file initializes the Supabase client that the frontend uses
 * to connect to the backend. It reads environment variables to keep
 * sensitive data out of the code.
 *
 * IMPORTANT: Only use EXPO_PUBLIC_* variables here (they're safe for frontend)
 */

import { createClient } from '@supabase/supabase-js';

// Get these from backend/.env. Vite exposes EXPO_PUBLIC_* because vite.config.ts
// explicitly allowlists these two values and points envDir at the backend folder.
const supabaseUrl = import.meta.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Simple validation - make sure keys are present
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR: Missing Supabase environment variables');
  console.error('Make sure these exist in backend/.env:');
  console.error('  - EXPO_PUBLIC_SUPABASE_URL');
  console.error('  - EXPO_PUBLIC_SUPABASE_ANON_KEY');
  throw new Error('Supabase configuration is missing');
}

// Create the Supabase client
// This client is safe to use in frontend code because:
// 1. It uses the ANON key (not the Service Role key)
// 2. Row Level Security (RLS) protects the database
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
