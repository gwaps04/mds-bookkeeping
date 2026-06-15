// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// This client bypasses ALL Row Level Security policies.
// NEVER use this in a component or action that isn't strictly verified.
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};