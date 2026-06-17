// src/features/expenses/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createExpense(formData: FormData) {
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
  const vendor_name = formData.get("vendor_name") as string;
  const amount = formData.get("amount");
  const date = formData.get("date");
  const account_id = formData.get("account_id");
  const category_id = formData.get("category_id");
  const description = formData.get("description");

  // 1. SMART VENDOR RESOLUTION: Find the vendor, or create a new one instantly
  let vendor_id = null;
  if (vendor_name) {
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("business_id", business_id)
      .ilike("name", vendor_name) // Case-insensitive search
      .maybeSingle();

    if (existingVendor) {
      vendor_id = existingVendor.id;
    } else {
      const { data: newVendor } = await supabase
        .from("vendors")
        .insert([{ business_id, name: vendor_name }])
        .select("id")
        .single();
      vendor_id = newVendor?.id;
    }
  }

  // 2. INSERT THE EXPENSE RECORD
  const { error } = await supabase
    .from("expenses")
    .insert([{
      business_id,
      vendor_id,
      account_id,
      category_id,
      amount,
      date,
      description,
      created_by: user.id
    }]);

  if (error) {
    console.error("Expense creation failed:", error);
    throw new Error(error.message);
  }

  // 3. REFRESH THE PAGE CACHE
  revalidatePath("/expenses");
}