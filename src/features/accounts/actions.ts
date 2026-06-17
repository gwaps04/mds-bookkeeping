// src/features/accounts/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Get the user's business ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  const business_id = profile?.business_id;
  
  // Extract form data
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const category = formData.get("category") as string;

  // 1. INSERT THE NEW ACCOUNT
  const { error } = await supabase
    .from("accounts")
    .insert([{
      business_id,
      name,
      type,
      category
    }]);

  if (error) {
    console.error("Account creation failed:", error);
    throw new Error(error.message);
  }

  // 2. REFRESH CACHES
  revalidatePath("/accounts"); // Refresh this page
  revalidatePath("/expenses"); // Refresh the dropdowns on Expenses
  revalidatePath("/income");   // Refresh the dropdowns on Income
}