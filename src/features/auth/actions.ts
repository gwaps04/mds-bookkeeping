// src/features/auth/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
// THE FIX 1: Import the Admin Client to bypass RLS during the onboarding sequence
import { createAdminClient } from "@/lib/supabase/admin"; 
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
// 2. SECURE SIGNUP (Upgraded with Profile Bridging)
// ============================================================================
export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const mobileNumber = formData.get("mobile_number") as string;
  const termsAccepted = formData.get("terms_accepted") === "true";

  const supabase = await createClient();
  
  // 1. Create the user in the hidden Auth schema
  const { data, error } = await supabase.auth.signUp({
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

  // ============================================================================
  // THE FIX 2: THE AUTH-TO-PUBLIC SCHEMA BRIDGE
  // ============================================================================
  // Because the default Supabase Trigger may not copy the new mobile_number column,
  // we use the Admin Client to forcefully update the public profile immediately.
  if (data?.user?.id && mobileNumber) {
    const adminAuthClient = createAdminClient();
    await adminAuthClient
      .from("profiles")
      .update({ 
        mobile_number: mobileNumber,
        // We also ensure full_name is perfectly synced just in case!
        full_name: fullName 
      })
      .eq("id", data.user.id);
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
// 4. PASSWORD RECOVERY ENGINE
// ============================================================================
export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
// 5. SECURE PASSWORD UPDATE
// ============================================================================
export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}