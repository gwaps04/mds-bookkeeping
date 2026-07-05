// src/features/expenses/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/audit";

// ============================================================================
// 1. CREATE EXPENSE (Available to Owners & Staff)
// ============================================================================
export async function createExpense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const business_id = profile?.business_id;
  
  const vendor_name = formData.get("vendor_name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const account_id = formData.get("account_id") as string;   
  const category_id = formData.get("category_id") as string; 
  const description = formData.get("description") as string;
  const reference_number = formData.get("reference_number") as string; 

  const receiptFile = formData.get("receipt") as File | null;

  // MATHEMATICAL SERVER GUARD
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Expense amount must be greater than zero.");
  }

  // SMART VENDOR RESOLUTION
  let vendor_id = null;
  if (vendor_name) {
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("id").eq("business_id", business_id).ilike("name", vendor_name).maybeSingle();

    if (existingVendor) {
      vendor_id = existingVendor.id;
    } else {
      const { data: newVendor } = await supabase
        .from("vendors").insert([{ business_id, name: vendor_name }]).select("id").single();
      vendor_id = newVendor?.id;
    }
  }

  // BINARY STORAGE ENGINE
  let receipt_url = null;
  if (receiptFile && receiptFile.size > 0 && receiptFile.name !== "undefined") {
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `${business_id}/${crypto.randomUUID()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, receiptFile);
      
    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);
        
      receipt_url = publicUrlData.publicUrl;
    }
  }

  // INSERT RECORD
  const { data: newExpense, error } = await supabase
    .from("expenses")
    .insert([{
      business_id, 
      vendor_id, 
      account_id, 
      category_id, 
      amount, 
      date, 
      description, 
      reference_number, 
      receipt_url,
      created_by: user.id
    }])
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // TRIGGER SECURITY TRIPWIRE
  await logSecurityEvent({
    businessId: business_id as string,
    actorId: user.id,
    action: "RECORDED_EXPENSE",
    tableName: "expenses",
    recordId: newExpense.id,
    details: { amount_paid: amount, account_name: vendor_name, notes: description, has_receipt: !!receipt_url }
  });

  revalidatePath("/expenses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}

// ============================================================================
// 2. UPDATE EXPENSE (Available to Owners & Staff)
// ============================================================================
export async function updateExpense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const business_id = profile?.business_id;

  const id = formData.get("id") as string;
  const vendor_name = formData.get("vendor_name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const account_id = formData.get("account_id") as string;
  const category_id = formData.get("category_id") as string;
  const description = formData.get("description") as string;
  const reference_number = formData.get("reference_number") as string;
  const editReason = formData.get("edit_reason") as string || "Staff manually edited a posted expense record.";
  
  const receiptFile = formData.get("receipt") as File | null;

  if (isNaN(amount) || amount <= 0) {
    throw new Error("Expense amount must be greater than zero.");
  }

  const { data: oldRecord } = await supabase.from("expenses").select("*").eq("id", id).single();

  // SMART VENDOR RESOLUTION
  let vendor_id = oldRecord?.vendor_id;
  if (vendor_name) {
    const { data: existingVendor } = await supabase
      .from("vendors")
      .select("id").eq("business_id", business_id).ilike("name", vendor_name).maybeSingle();

    if (existingVendor) {
      vendor_id = existingVendor.id;
    } else {
      const { data: newVendor } = await supabase
        .from("vendors").insert([{ business_id, name: vendor_name }]).select("id").single();
      vendor_id = newVendor?.id;
    }
  }

  // BINARY STORAGE ENGINE
  let receipt_url = oldRecord?.receipt_url;
  if (receiptFile && receiptFile.size > 0 && receiptFile.name !== "undefined") {
    const fileExt = receiptFile.name.split('.').pop();
    const fileName = `${business_id}/${crypto.randomUUID()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, receiptFile);
      
    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);
        
      receipt_url = publicUrlData.publicUrl;
    }
  }

  const { error } = await supabase
    .from("expenses")
    .update({ 
      vendor_id, account_id, category_id, amount, date, description, reference_number, receipt_url 
    })
    .eq("id", id).eq("business_id", business_id);

  if (error) throw new Error(error.message);

  // TRIGGER SECURITY TRIPWIRE
  await logSecurityEvent({
    businessId: business_id as string,
    actorId: user.id,
    action: "EDITED_EXPENSE",
    tableName: "expenses",
    recordId: id,
    details: { 
      previous: { amount: oldRecord?.amount, description: oldRecord?.description },
      new: { amount, description, vendor_name, has_receipt: !!receipt_url },
      reason: editReason
    }
  });

  revalidatePath("/expenses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/expenses");
}

// ============================================================================
// 3. DELETE EXPENSE (OWNERS ONLY)
// ============================================================================
export async function deleteExpense(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;
  const voidReason = formData.get("void_reason") as string || "Owner forced deletion.";

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Staff members are not permitted to delete financial records.");
  }

  const { data: targetRecord } = await supabase.from("expenses").select("amount, description, receipt_url, vendors(name)").eq("id", id).single();
  
  // TYPESCRIPT SAFE CASTING
  const vendorData = targetRecord?.vendors as any;
  const vendorName = Array.isArray(vendorData) ? vendorData[0]?.name : vendorData?.name;
  
  if (targetRecord?.receipt_url) {
    const urlParts = targetRecord.receipt_url.split('/receipts/');
    if (urlParts.length > 1) {
      supabase.storage.from('receipts').remove([urlParts[1]]);
    }
  }

  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("business_id", profile.business_id);
  if (error) throw new Error(error.message);

  // TRIGGER SECURITY TRIPWIRE
  await logSecurityEvent({
    businessId: profile.business_id as string,
    actorId: user.id,
    action: "DELETED_EXPENSE",
    tableName: "expenses",
    recordId: id,
    details: { account_name: vendorName || 'General Payee', voided_amount: targetRecord?.amount, notes: targetRecord?.description, reason: voidReason }
  });

  revalidatePath("/expenses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}