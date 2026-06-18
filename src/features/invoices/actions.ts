// src/features/invoices/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/audit"; 

// ============================================================================
// 1. CREATE INVOICE
// ============================================================================
export async function createOfficialInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;

  // 1. EXTRACT DATA
  const clientName = formData.get("client_name") as string;
  const dueDate = formData.get("due_date") as string;
  const itemsJson = formData.get("items") as string;
  const items = JSON.parse(itemsJson);

  if (!items || items.length === 0) throw new Error("Invoices must have at least one item.");

  // 2. CALCULATE MASTER TOTAL
  const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

  // 3. INSERT MASTER INVOICE
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert([{
      business_id: businessId,
      client_name: clientName,
      due_date: dueDate,
      status: "sent",
      total_amount: totalAmount
    }])
    .select("id")
    .single();

  if (invoiceError) throw new Error(invoiceError.message);

  // 4. PREPARE & INSERT LINE ITEMS
  const formattedItems = items.map((item: any) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price
  }));

  const { error: itemsError } = await supabase
    .from("invoice_items")
    .insert(formattedItems);

  if (itemsError) throw new Error(itemsError.message);

  // --- 5. THE SECURITY TRIPWIRE ---
  await logSecurityEvent({
    businessId: businessId as string,
    actorId: user.id, // We record exactly who clicked the button
    action: "CREATED_INVOICE",
    tableName: "invoices",
    recordId: invoice.id,
    details: { client_name: clientName, total_amount: totalAmount }
  });
  // ------------------------------------

  // 6. REFRESH & REDIRECT TO THE PRINTABLE PDF
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

// ============================================================================
// 2. UPDATE INVOICE (STAFF & OWNERS)
// ============================================================================
export async function updateOfficialInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();
  const businessId = profile?.business_id;

  // 1. EXTRACT DATA
  const id = formData.get("id") as string;
  const clientName = formData.get("client_name") as string;
  const dueDate = formData.get("due_date") as string;
  const status = formData.get("status") as string;
  const itemsJson = formData.get("items") as string;
  const items = JSON.parse(itemsJson);

  if (!items || items.length === 0) throw new Error("Invoices must have at least one item.");

  // 2. CALCULATE NEW TOTAL
  const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

  // 3. UPDATE MASTER INVOICE
  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({ 
      client_name: clientName, 
      due_date: dueDate, 
      status: status, 
      total_amount: totalAmount 
    })
    .eq("id", id)
    .eq("business_id", businessId);

  if (invoiceError) throw new Error(invoiceError.message);

  // 4. REPLACE LINE ITEMS (Safest way to handle dynamic arrays)
  // Delete old items first to prevent duplicate stacking
  await supabase.from("invoice_items").delete().eq("invoice_id", id); 
  
  const formattedItems = items.map((item: any) => ({
    invoice_id: id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price
  }));

  // Insert the newly updated items
  const { error: itemsError } = await supabase.from("invoice_items").insert(formattedItems); 
  if (itemsError) throw new Error(itemsError.message);

  // --- 5. TRIGGER TRIPWIRE ---
  await logSecurityEvent({
    businessId: businessId as string, 
    actorId: user.id, 
    action: "EDITED_INVOICE", 
    tableName: "invoices", 
    recordId: id,
    details: { client_name: clientName, new_total: totalAmount, new_status: status }
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${id}`);
}

// ============================================================================
// 3. DELETE INVOICE (OWNERS ONLY)
// ============================================================================
export async function deleteOfficialInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  // Security Check: Enforce RBAC
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();
    
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Staff members are not permitted to delete invoices.");
  }

  // Fetch record before deleting for the audit log
  const { data: targetRecord } = await supabase.from("invoices").select("*").eq("id", id).single();

  // We MUST delete the line items first to prevent PostgreSQL Foreign Key constraints from blocking us!
  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  
  // Now we can safely delete the master invoice
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("business_id", profile.business_id);
  
  if (error) throw new Error(error.message);

  // --- TRIGGER TRIPWIRE ---
  await logSecurityEvent({
    businessId: profile.business_id as string, 
    actorId: user.id, 
    action: "DELETED_INVOICE", 
    tableName: "invoices", 
    recordId: id,
    details: { client_name: targetRecord?.client_name, amount: targetRecord?.total_amount }
  });

  revalidatePath("/invoices");
}