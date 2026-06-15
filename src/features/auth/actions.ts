// src/features/auth/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Redirect bypasses the rest of the function on success
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Note: Depending on your Supabase settings, they may need to check their email.
  // Assuming auto-confirm is on for local development:
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  
  // Destroys the session in the database AND tells the browser to delete the cookie
  await supabase.auth.signOut(); 
  
  // Route back to the Auth Gate
  redirect("/login");
}