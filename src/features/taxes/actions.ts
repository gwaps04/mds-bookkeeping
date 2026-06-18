// src/features/taxes/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/audit";

// ============================================================================
// 1. LOG NEW TAX PAYMENT
// ============================================================================
export async function logTaxPayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  // SELF-HEALING: LOCATE OR CREATE THE OFFICIAL TAX ACCOUNT
  let { data: taxCategory } = await supabase
    .from("accounts")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", "Taxes, Licenses & Fees")
    .single();

  if (!taxCategory) {
    const { data: newTaxCategory, error: createError } = await supabase
      .from("accounts")
      .insert([{ business_id: businessId, name: "Taxes, Licenses & Fees", type: "expense", category: "Financial" }])
      .select("id").single();
    if (createError) throw new Error("System Error: Failed to auto-provision the Tax account.");
    taxCategory = newTaxCategory;
  }

  // Extract Form Data
  const formType = formData.get("form_type") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const paidFromAccountId = formData.get("account_id") as string; 
  const reference = formData.get("reference") as string;

  const description = `BIR Form ${formType} Payment`;

  // INSERT RECORD (Now using the new reference_number column!)
  const { data: newTax, error } = await supabase
    .from("expenses")
    .insert([{
      business_id: businessId, account_id: paidFromAccountId, category_id: taxCategory.id,   
      amount, date, description, reference_number: reference, created_by: user.id
    }])
    .select("id").single();

  if (error) throw new Error(error.message);

  // TRIGGER SECURITY TRIPWIRE
  await logSecurityEvent({
    businessId: businessId as string, actorId: user.id, action: "LOGGED_TAX_PAYMENT", tableName: "expenses", recordId: newTax.id,
    details: { form_type: formType, amount }
  });

  revalidatePath("/taxes");
  revalidatePath("/expenses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

// ============================================================================
// 2. UPDATE TAX PAYMENT (STAFF & OWNERS)
// ============================================================================
export async function updateTaxPayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  
  const id = formData.get("id") as string;
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const account_id = formData.get("account_id") as string;
  const reference = formData.get("reference") as string;

  const { data: oldRecord } = await supabase.from("expenses").select("*").eq("id", id).single();

  const { error } = await supabase
    .from("expenses")
    .update({ description, amount, date, account_id, reference_number: reference })
    .eq("id", id).eq("business_id", profile?.business_id);

  if (error) throw new Error(error.message);

  // TRIGGER SECURITY TRIPWIRE
  await logSecurityEvent({
    businessId: profile?.business_id as string, actorId: user.id, action: "EDITED_TAX_PAYMENT", tableName: "expenses", recordId: id,
    details: { previous_amount: oldRecord?.amount, new_amount: amount, form: description }
  });

  revalidatePath("/taxes");
  revalidatePath("/expenses");
  revalidatePath("/transactions");
  redirect("/taxes");
}

// ============================================================================
// 3. DELETE TAX PAYMENT (OWNERS ONLY)
// ============================================================================
export async function deleteTaxPayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Staff members are not permitted to delete financial records.");
  }

  const { data: targetRecord } = await supabase.from("expenses").select("*").eq("id", id).single();
  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("business_id", profile.business_id);
  
  if (error) throw new Error(error.message);

  await logSecurityEvent({
    businessId: profile.business_id, actorId: user.id, action: "DELETED_TAX_PAYMENT", tableName: "expenses", recordId: id,
    details: { amount: targetRecord?.amount, form: targetRecord?.description }
  });

  revalidatePath("/taxes");
  revalidatePath("/expenses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}