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
  const amount = formData.get("amount");
  const date = formData.get("date");
  const account_id = formData.get("account_id");   
  const category_id = formData.get("category_id"); 
  const description = formData.get("description");
  const reference_number = formData.get("reference_number"); 

  // THE FIX: Intercept the binary file payload
  const receiptFile = formData.get("receipt") as File | null;

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
    // Cryptographic isolation: business_id / random-uuid . ext
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
      receipt_url, // Injected the URL into the DB!
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
    details: { amount, vendor_name, description, has_receipt: !!receipt_url }
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
  const amount = formData.get("amount");
  const date = formData.get("date");
  const account_id = formData.get("account_id");
  const category_id = formData.get("category_id");
  const description = formData.get("description");
  const reference_number = formData.get("reference_number");
  
  const receiptFile = formData.get("receipt") as File | null;

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

  // BINARY STORAGE ENGINE (Keep old URL unless a new file is uploaded)
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
      vendor_id, 
      account_id, 
      category_id, 
      amount, 
      date, 
      description, 
      reference_number,
      receipt_url 
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
      new: { amount, description, vendor_name, has_receipt: !!receipt_url } 
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

  // Security Check: Block Staff
  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Staff members are not permitted to delete financial records.");
  }

  const { data: targetRecord } = await supabase.from("expenses").select("*").eq("id", id).single();
  
  // OPTIONAL: Delete the physical file from the bucket if we want to save space
  if (targetRecord?.receipt_url) {
    // Extract the filename from the URL (everything after "receipts/")
    const urlParts = targetRecord.receipt_url.split('/receipts/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      // Fire and forget (don't await) so we don't slow down the UI deletion if it fails
      supabase.storage.from('receipts').remove([filePath]);
    }
  }

  const { error } = await supabase.from("expenses").delete().eq("id", id).eq("business_id", profile.business_id);
  
  if (error) throw new Error(error.message);

  // TRIGGER SECURITY TRIPWIRE
  await logSecurityEvent({
    businessId: profile.business_id,
    actorId: user.id,
    action: "DELETED_EXPENSE",
    tableName: "expenses",
    recordId: id,
    details: { amount: targetRecord?.amount, description: targetRecord?.description }
  });

  revalidatePath("/expenses");
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}