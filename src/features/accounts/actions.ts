// src/features/accounts/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/audit";

// ============================================================================
// 1. CREATE ACCOUNT (Helper for future use)
// ============================================================================
export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const category = formData.get("category") as string;
  const account_number = formData.get("account_number") as string;

  const { data: newAccount, error } = await supabase.from("accounts").insert([{
    business_id: profile?.business_id, name, type, category, account_number
  }]).select("id").single();

  if (error) throw new Error(error.message);

  await logSecurityEvent({
    businessId: profile?.business_id as string, actorId: user.id, action: "CREATED_ACCOUNT", tableName: "accounts", recordId: newAccount.id,
    details: { name, type }
  });

  revalidatePath("/accounts");
}

// ============================================================================
// 2. UPDATE ACCOUNT (STAFF & OWNERS)
// ============================================================================
export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const category = formData.get("category") as string;
  const account_number = formData.get("account_number") as string;

  const { data: oldRecord } = await supabase.from("accounts").select("*").eq("id", id).single();

  const { error } = await supabase.from("accounts").update({
    name, type, category, account_number
  }).eq("id", id).eq("business_id", profile?.business_id);

  if (error) throw new Error(error.message);

  await logSecurityEvent({
    businessId: profile?.business_id as string, actorId: user.id, action: "EDITED_ACCOUNT", tableName: "accounts", recordId: id,
    details: { previous_name: oldRecord?.name, new_name: name, type }
  });

  revalidatePath("/accounts");
  redirect("/accounts");
}

// ============================================================================
// 3. DELETE ACCOUNT (THE CONSTRAINT CHECKER)
// ============================================================================
export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Staff members are not permitted to delete structural accounts.");
  }

  const { data: targetRecord } = await supabase.from("accounts").select("*").eq("id", id).single();

  // --- THE CONSTRAINT CHECKER ENGINE ---
  // 1. Check if used in Income
  const { count: incomeCount } = await supabase
    .from("income")
    .select("*", { count: "exact", head: true })
    .or(`account_id.eq.${id},category_id.eq.${id}`);

  // 2. Check if used in Expenses
  const { count: expenseCount } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .or(`account_id.eq.${id},category_id.eq.${id}`);

  // 3. Block Deletion if in use!
  if ((incomeCount && incomeCount > 0) || (expenseCount && expenseCount > 0)) {
    throw new Error(`DATA INTEGRITY SHIELD: Cannot delete "${targetRecord?.name}". It is currently linked to ${Number(incomeCount) + Number(expenseCount)} historical transactions. If you no longer use this account, rename it to "(Archived) ${targetRecord?.name}" instead.`);
  }

  // If clean, proceed with deletion
  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("business_id", profile?.business_id);
  if (error) throw new Error(error.message);

  await logSecurityEvent({
    businessId: profile?.business_id as string, actorId: user.id, action: "DELETED_ACCOUNT", tableName: "accounts", recordId: id,
    details: { account_name: targetRecord?.name, type: targetRecord?.type }
  });

  revalidatePath("/accounts");
}