// src/features/auth/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// ============================================================================
// 1. SECURE LOGIN
// ============================================================================
export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  redirect("/dashboard");
}

// ============================================================================
// 2. SECURE SIGNUP 
// ============================================================================
export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const mobileNumber = formData.get("mobile_number") as string;
  const termsAccepted = formData.get("terms_accepted") === "true";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        mobile_number: mobileNumber, 
        terms_accepted_at: termsAccepted ? new Date().toISOString() : null,
      },
    },
  });

  if (error) {
    if (error.message.includes("unique_mobile_number") || error.message.includes("duplicate key value")) {
      return { error: "This mobile number is already registered to another account. Please use a different number or sign in." };
    }
    return { error: error.message };
  }
  redirect("/dashboard");
}

// ============================================================================
// 3. SECURE LOGOUT
// ============================================================================
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut(); 
  redirect("/login");
}

// ============================================================================
// 4. PASSWORD RECOVERY ENGINE (Generates the Email)
// ============================================================================
export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // IMPORTANT: We now send them to the API callback route first!
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
  });

  if (error) {
    if (error.message.includes("User not found")) return { success: true }; 
    return { error: error.message };
  }
  return { success: true };
}

// ============================================================================
// 5. SECURE PASSWORD UPDATE (Session-Only)
// ============================================================================
export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = await createClient();

  // The Callback Route already established our secure session, so we just update!
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}