// src/features/income/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/audit";

// ============================================================================
// 1. CREATE DIRECT INCOME
// ============================================================================
export async function createIncome(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  const customerName = formData.get("customer_name") as string || "Walk-in";
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const categoryId = formData.get("category_id") as string;
  const accountId = formData.get("account_id") as string;
  const reference = formData.get("reference_number") as string;
  const description = formData.get("description") as string;

  // MATHEMATICAL SERVER GUARD: Prevent Zero or Negative Amounts
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Income amount must be greater than zero.");
  }

  // SMART CUSTOMER RESOLUTION
  let customerId = null;
  if (customerName !== "Walk-in") {
    let { data: existingCustomer } = await supabase.from("customers").select("id").eq("business_id", businessId).ilike("name", customerName).maybeSingle();
    if (!existingCustomer) {
      const { data: newCustomer } = await supabase.from("customers").insert([{ business_id: businessId, name: customerName }]).select("id").single();
      customerId = newCustomer?.id;
    } else {
      customerId = existingCustomer.id;
    }
  }

  const { data: newIncome, error } = await supabase.from("income").insert([{
    business_id: businessId,
    customer_id: customerId,
    amount: amount,
    date: date,
    category_id: categoryId,
    account_id: accountId,
    reference_number: reference,
    description: description,
    created_by: user.id
  }]).select("id").single();

  if (error) throw new Error(error.message);

  // RICH AUDIT LOGGING
  await logSecurityEvent({
    businessId: businessId as string, actorId: user.id, action: "RECORDED_INCOME", tableName: "income", recordId: newIncome.id,
    details: { client_name: customerName, amount: amount, notes: description }
  });

  revalidatePath("/income");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

// ============================================================================
// 2. UPDATE DIRECT INCOME
// ============================================================================
export async function updateIncome(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  const id = formData.get("id") as string;
  const customerName = formData.get("customer_name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const accountId = formData.get("account_id") as string;
  const categoryId = formData.get("category_id") as string;
  const reference = formData.get("reference_number") as string;
  const description = formData.get("description") as string;
  const editReason = formData.get("edit_reason") as string || "Staff manually edited income record.";

  // MATHEMATICAL SERVER GUARD
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Income amount must be greater than zero.");
  }

  // Fetch old record for the Audit Trail comparison
  const { data: oldRecord } = await supabase.from("income").select("amount, description, customer_id").eq("id", id).single();

  // SMART CUSTOMER RESOLUTION
  let customerId = oldRecord?.customer_id;
  if (customerName) {
    const { data: existingCustomer } = await supabase.from("customers").select("id").eq("business_id", businessId).ilike("name", customerName).maybeSingle();
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabase.from("customers").insert([{ business_id: businessId, name: customerName }]).select("id").single();
      customerId = newCustomer?.id;
    }
  }

  const { error } = await supabase.from("income").update({
    customer_id: customerId, account_id: accountId, category_id: categoryId, amount: amount, date: date, reference_number: reference, description: description
  }).eq("id", id).eq("business_id", businessId);

  if (error) throw new Error(error.message);

  // RICH AUDIT LOGGING
  await logSecurityEvent({
    businessId: businessId as string, actorId: user.id, action: "EDITED_INCOME", tableName: "income", recordId: id,
    details: { old_amount: oldRecord?.amount, new_amount: amount, reason: editReason }
  });

  revalidatePath("/income");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/income");
}

// ============================================================================
// 3. DELETE / VOID DIRECT INCOME
// ============================================================================
export async function deleteIncome(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  if (!profile?.business_id) throw new Error("No business found");

  if (profile.role !== 'business_owner' && profile.role !== 'super_admin') {
    throw new Error("Security Violation: Only Business Owners can void a posted income record.");
  }

  const id = formData.get("id") as string;
  // Capture the mandatory void reason passed from the UI
  const voidReason = formData.get("void_reason") as string || "Owner forced deletion.";

  // Fetch record for the Audit Trail BEFORE deleting
  const { data: targetRecord } = await supabase.from("income").select("amount, description, customers(name)").eq("id", id).single();
  
  // THE FIX: Safely cast the relational data to 'any' to bypass TS 'never' inference
  const customersData = targetRecord?.customers as any;
  const clientName = Array.isArray(customersData) ? customersData[0]?.name : customersData?.name;

  const { error } = await supabase.from("income").delete().eq("id", id).eq("business_id", profile.business_id);
  if (error) throw new Error(error.message);

  // RICH AUDIT LOGGING (Non-Repudiation)
  await logSecurityEvent({
    businessId: profile.business_id as string, actorId: user.id, action: "DELETED_INCOME", tableName: "income", recordId: id,
    details: { client_name: clientName || 'Walk-in', voided_amount: targetRecord?.amount, notes: targetRecord?.description, reason: voidReason }
  });

  revalidatePath("/income");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}