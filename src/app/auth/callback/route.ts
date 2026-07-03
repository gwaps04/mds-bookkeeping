// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  // 1. Intercept the URL from the email click
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // 2. If a cryptographic code exists, exchange it instantly for a cookie session
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 3. Success! Redirect to the update-password page
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 4. If the code was missing or expired, send them back to login
  return NextResponse.redirect(`${origin}/login?error=Invalid_recovery_link`);
}