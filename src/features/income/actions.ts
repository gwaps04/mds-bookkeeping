// src/features/income/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createIncome(formData: FormData) {
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
  const customer_name = formData.get("customer_name") as string;
  const amount = formData.get("amount");
  const date = formData.get("date");
  const account_id = formData.get("account_id");
  const category_id = formData.get("category_id");
  const description = formData.get("description");
  const reference_number = formData.get("reference_number"); // Great for GCash/Bank Ref numbers

  // 1. SMART CUSTOMER RESOLUTION: Find the customer, or create a new one instantly
  let customer_id = null;
  if (customer_name) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", business_id)
      .ilike("name", customer_name) // Case-insensitive search
      .maybeSingle();

    if (existingCustomer) {
      customer_id = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert([{ business_id, name: customer_name }])
        .select("id")
        .single();
      customer_id = newCustomer?.id;
    }
  }

  // 2. INSERT THE INCOME RECORD
  const { error } = await supabase
    .from("income")
    .insert([{
      business_id,
      customer_id,
      account_id,
      category_id,
      amount,
      date,
      description,
      reference_number,
      created_by: user.id
    }]);

  if (error) {
    console.error("Income creation failed:", error);
    throw new Error(error.message);
  }

  // 3. REFRESH THE PAGE CACHE
  revalidatePath("/income");
}