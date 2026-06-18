// src/features/income/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/audit"; // <-- The Security Logger!

// ============================================================================
// 1. CREATE INCOME (Available to Owners & Staff)
// ============================================================================
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
  const reference_number = formData.get("reference_number"); 

  // SMART CUSTOMER RESOLUTION: Find the customer, or create a new one instantly
  let customer_id = null;
  if (customer_name) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", business_id)
      .ilike("name", customer_name) 
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

  // INSERT THE INCOME RECORD
  // (We added .select("id").single() so we can capture the ID for the audit log)
  const { data: newIncome, error } = await supabase
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
    }])
    .select("id")
    .single();

  if (error) {
    console.error("Income creation failed:", error);
    throw new Error(error.message);
  }

  // --- TRIGGER SECURITY TRIPWIRE ---
  await logSecurityEvent({
    businessId: business_id as string,
    actorId: user.id,
    action: "RECORDED_INCOME",
    tableName: "income",
    recordId: newIncome.id,
    details: { amount, customer_name, description }
  });

  revalidatePath("/income");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

// ============================================================================
// 2. UPDATE INCOME (Available to Owners & Staff)
// ============================================================================
export async function updateIncome(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const business_id = profile?.business_id;

  const id = formData.get("id") as string;
  const customer_name = formData.get("customer_name") as string;
  const amount = formData.get("amount");
  const date = formData.get("date");
  const account_id = formData.get("account_id");
  const category_id = formData.get("category_id");
  const description = formData.get("description");
  const reference_number = formData.get("reference_number");

  // Fetch old record for the Audit Trail
  const { data: oldRecord } = await supabase.from("income").select("*").eq("id", id).single();

  // SMART CUSTOMER RESOLUTION (For Edits)
  let customer_id = oldRecord?.customer_id;
  if (customer_name) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", business_id)
      .ilike("name", customer_name)
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

  // Execute Update
  const { error } = await supabase
    .from("income")
    .update({
      customer_id, account_id, category_id, amount, date, description, reference_number
    })
    .eq("id", id)
    .eq("business_id", business_id);

  if (error) throw new Error(error.message);

  // --- TRIGGER SECURITY TRIPWIRE ---
  await logSecurityEvent({
    businessId: business_id as string,
    actorId: user.id,
    action: "EDITED_INCOME",
    tableName: "income",
    recordId: id,
    details: { 
      previous: { amount: oldRecord?.amount, description: oldRecord?.description },
      new: { amount, description, customer_name } 
    }
  });

  revalidatePath("/income");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/income");
}

// ============================================================================
// 3. DELETE INCOME (OWNERS ONLY)
// ============================================================================
export async function deleteIncome(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  // Security Check: Block Staff
  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Staff members are not permitted to delete financial records.");
  }

  // Fetch record for the Audit Trail BEFORE deleting
  const { data: targetRecord } = await supabase.from("income").select("*").eq("id", id).single();

  const { error } = await supabase.from("income").delete().eq("id", id).eq("business_id", profile.business_id);
  if (error) throw new Error(error.message);

  // --- TRIGGER SECURITY TRIPWIRE ---
  await logSecurityEvent({
    businessId: profile.business_id,
    actorId: user.id,
    action: "DELETED_INCOME",
    tableName: "income",
    recordId: id,
    details: { amount: targetRecord?.amount, description: targetRecord?.description }
  });

  revalidatePath("/income");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}