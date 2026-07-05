// src/features/accounts/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/audit";

// ============================================================================
// 1. CREATE ACCOUNT
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
    businessId: profile?.business_id as string, 
    actorId: user.id, 
    action: "CREATED_ACCOUNT", 
    tableName: "accounts", 
    recordId: newAccount.id,
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
    businessId: profile?.business_id as string, 
    actorId: user.id, 
    action: "EDITED_ACCOUNT", 
    tableName: "accounts", 
    recordId: id,
    details: { previous_name: oldRecord?.name, new_name: name, type }
  });

  revalidatePath("/accounts");
  redirect("/accounts");
}

// ============================================================================
// 3. DELETE / SMART ARCHIVE ACCOUNT (DEFENSE IN DEPTH)
// ============================================================================
export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  // Capture the mandatory remarks from the ArchiveAccountDialog
  const reason = formData.get("reason") as string || "No reason provided"; 
  
  if (!id) throw new Error("Missing ID");

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Staff members are not permitted to delete structural accounts.");
  }

  const { data: targetRecord } = await supabase.from("accounts").select("*").eq("id", id).single();

  // --- LAYER 1: APPLICATION CONSTRAINT CHECKER ---
  const { count: incomeCount } = await supabase
    .from("income")
    .select("*", { count: "exact", head: true })
    .or(`account_id.eq.${id},category_id.eq.${id}`);

  const { count: expenseCount } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .or(`account_id.eq.${id},category_id.eq.${id}`);

  const isInUse = (incomeCount && incomeCount > 0) || (expenseCount && expenseCount > 0);

  if (isInUse) {
    // PIVOT TO SOFT ARCHIVE
    const { error: archiveError } = await supabase
      .from("accounts")
      .update({ is_archived: true })
      .eq("id", id)
      .eq("business_id", profile?.business_id);

    if (archiveError) throw new Error(archiveError.message);

    await logSecurityEvent({
      businessId: profile?.business_id as string, 
      actorId: user.id, 
      action: "ARCHIVED_ACCOUNT", 
      tableName: "accounts", 
      recordId: id,
      details: { account_name: targetRecord?.name, reason: `Archived: ${reason}` }
    });

  } else {
    // ATTEMPT HARD DELETE (No known transactions)
    const { error } = await supabase.from("accounts").delete().eq("id", id).eq("business_id", profile?.business_id);
    
    if (error) {
      // --- LAYER 2: RDBMS CONSTRAINT FALLBACK (Code 23503) ---
      if (error.code === '23503') {
        const { error: fallbackArchive } = await supabase.from("accounts").update({ is_archived: true }).eq("id", id);
        if (fallbackArchive) throw new Error(fallbackArchive.message);
        
        await logSecurityEvent({
          businessId: profile?.business_id as string, 
          actorId: user.id, 
          action: "ARCHIVED_ACCOUNT", 
          tableName: "accounts", 
          recordId: id,
          details: { account_name: targetRecord?.name, reason: `FK Archive: ${reason}` }
        });
      } else {
        throw new Error(error.message);
      }
    } else {
      // SUCCESSFUL HARD DELETE
      await logSecurityEvent({
        businessId: profile?.business_id as string, 
        actorId: user.id, 
        action: "DELETED_ACCOUNT", 
        tableName: "accounts", 
        recordId: id,
        details: { account_name: targetRecord?.name, reason: `Deleted: ${reason}` }
      });
    }
  }

  revalidatePath("/accounts");
  revalidatePath("/expenses");
  revalidatePath("/income");
}

// ============================================================================
// 4. RESTORE ARCHIVED ACCOUNT
// ============================================================================
export async function restoreAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing ID");

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Only owners can restore structural accounts.");
  }

  const { data: targetRecord } = await supabase.from("accounts").select("name").eq("id", id).single();

  const { error } = await supabase
    .from("accounts")
    .update({ is_archived: false })
    .eq("id", id)
    .eq("business_id", profile?.business_id);

  if (error) throw new Error(error.message);

  await logSecurityEvent({
    businessId: profile?.business_id as string, 
    actorId: user.id, 
    action: "RESTORED_ACCOUNT", 
    tableName: "accounts", 
    recordId: id,
    details: { account_name: targetRecord?.name, reason: "Account restored to active ledger." }
  });

  revalidatePath("/accounts");
  revalidatePath("/expenses");
  revalidatePath("/income");
}