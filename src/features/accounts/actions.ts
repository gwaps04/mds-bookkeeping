// src/features/accounts/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const account_number = formData.get("account_number") as string;

  // 1. ATTEMPT SECURE INSERTION
  const { error } = await supabase
    .from("accounts")
    .insert([{
      business_id,
      name,
      type,
      category,
      account_number: account_number || null // Save as null if left blank
    }]);

  if (error) {
    console.error("Account creation catch triggered:", error);
    // Code 23505 is the Postgres code for Unique Constraint Violations
    if (error.code === '23505') {
      redirect("/accounts?error=duplicate");
    }
    redirect(`/accounts?error=${encodeURIComponent(error.message)}`);
  }

  // 2. REFRESH ALL FINANCIAL PIPELINES ON SUCCESS
  revalidatePath("/accounts");
  revalidatePath("/expenses");
  revalidatePath("/income");
  redirect("/accounts");
}