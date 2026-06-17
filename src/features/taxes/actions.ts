// src/features/taxes/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function logTaxPayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. Get Business ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;

  // 2. SELF-HEALING: LOCATE OR CREATE THE OFFICIAL TAX ACCOUNT
  let { data: taxCategory } = await supabase
    .from("accounts")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", "Taxes, Licenses & Fees")
    .single();

  // If the account doesn't exist (deleted by user, or legacy account), auto-create it!
  if (!taxCategory) {
    console.log("[MDS System]: Tax account missing. Auto-provisioning now...");
    const { data: newTaxCategory, error: createError } = await supabase
      .from("accounts")
      .insert([{
        business_id: businessId,
        name: "Taxes, Licenses & Fees",
        type: "expense",
        category: "Financial"
      }])
      .select("id")
      .single();

    if (createError) {
      throw new Error("System Error: Failed to auto-provision the Tax account.");
    }
    taxCategory = newTaxCategory;
  }

  // 3. Extract Form Data
  const formType = formData.get("form_type") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const paidFromAccountId = formData.get("account_id") as string; 
  const reference = formData.get("reference") as string;

  const description = `BIR Form ${formType} Payment${reference ? ` (Ref: ${reference})` : ''}`;

  // 4. INSERT INTO EXPENSES
  const { error } = await supabase
    .from("expenses")
    .insert([{
      business_id: businessId,
      account_id: paidFromAccountId, 
      category_id: taxCategory.id,   
      amount: amount,
      date: date,
      description: description,
      created_by: user.id
    }]);

  if (error) {
    console.error("Tax logging failed:", error);
    throw new Error(error.message);
  }

  // 5. REFRESH CACHES
  revalidatePath("/taxes");
  revalidatePath("/expenses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}