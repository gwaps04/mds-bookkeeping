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

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  const clientName = formData.get("client_name") as string;
  const dueDate = formData.get("due_date") as string;
  const itemsJson = formData.get("items") as string;
  const items = JSON.parse(itemsJson);

  if (!items || items.length === 0) throw new Error("Invoices must have at least one item.");

  const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

  const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert([{
    business_id: businessId,
    client_name: clientName,
    due_date: dueDate,
    status: "sent",
    total_amount: totalAmount
  }]).select("id").single();

  if (invoiceError) throw new Error(invoiceError.message);

  const formattedItems = items.map((item: any) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price
  }));

  const { error: itemsError } = await supabase.from("invoice_items").insert(formattedItems);
  if (itemsError) throw new Error(itemsError.message);

  const displayId = invoice.id.split('-')[0].toUpperCase();

  await logSecurityEvent({
    businessId: businessId as string, actorId: user.id, action: "CREATED_INVOICE", tableName: "invoices", recordId: invoice.id,
    details: { invoice_number: displayId, client_name: clientName, total_amount: totalAmount }
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

// ============================================================================
// 2. UPDATE INVOICE
// ============================================================================
export async function updateOfficialInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  const id = formData.get("id") as string;
  const clientName = formData.get("client_name") as string;
  const dueDate = formData.get("due_date") as string;
  const status = formData.get("status") as string;
  const itemsJson = formData.get("items") as string;
  const items = JSON.parse(itemsJson);

  if (!items || items.length === 0) throw new Error("Invoices must have at least one item.");

  const totalAmount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

  const { error: invoiceError } = await supabase.from("invoices").update({ 
    client_name: clientName, due_date: dueDate, status: status, total_amount: totalAmount 
  }).eq("id", id).eq("business_id", businessId);

  if (invoiceError) throw new Error(invoiceError.message);

  await supabase.from("invoice_items").delete().eq("invoice_id", id); 
  
  const formattedItems = items.map((item: any) => ({
    invoice_id: id, description: item.description, quantity: item.quantity, unit_price: item.unit_price, total_price: item.quantity * item.unit_price
  }));

  const { error: itemsError } = await supabase.from("invoice_items").insert(formattedItems); 
  if (itemsError) throw new Error(itemsError.message);

  const displayId = id.split('-')[0].toUpperCase();

  await logSecurityEvent({
    businessId: businessId as string, actorId: user.id, action: "EDITED_INVOICE", tableName: "invoices", recordId: id,
    details: { invoice_number: displayId, client_name: clientName, new_total: totalAmount, new_status: status }
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${id}`);
}

// ============================================================================
// 3. DELETE INVOICE
// ============================================================================
export async function deleteOfficialInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const id = formData.get("id") as string;

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Staff members are not permitted to delete invoices.");
  }

  const { data: targetRecord } = await supabase.from("invoices").select("*").eq("id", id).single();
  await supabase.from("invoice_items").delete().eq("invoice_id", id);
  const { error } = await supabase.from("invoices").delete().eq("id", id).eq("business_id", profile.business_id);
  if (error) throw new Error(error.message);

  const displayId = id.split('-')[0].toUpperCase();

  await logSecurityEvent({
    businessId: profile.business_id as string, actorId: user.id, action: "DELETED_INVOICE", tableName: "invoices", recordId: id,
    details: { invoice_number: displayId, client_name: targetRecord?.client_name, amount: targetRecord?.total_amount }
  });

  revalidatePath("/invoices");
}

// ============================================================================
// 4. RECORD INVOICE PAYMENT
// ============================================================================
export async function recordInvoicePayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  const invoiceId = formData.get("invoice_id") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const accountId = formData.get("account_id") as string;
  const reference = formData.get("reference") as string;
  const clientName = formData.get("client_name") as string;
  const customDescription = formData.get("description") as string;

  if (isNaN(amount) || amount <= 0) throw new Error("Payment amount must be greater than zero.");

  let { data: revCategory } = await supabase.from("accounts").select("id").eq("business_id", businessId).eq("name", "Accounts Receivable / Invoices").single();
  
  if (!revCategory) {
    const { data: newCat } = await supabase.from("accounts").insert([{ business_id: businessId, name: "Accounts Receivable / Invoices", type: "revenue" }]).select("id").single();
    revCategory = newCat;
  }

  const finalDescription = customDescription && customDescription.trim() !== "" ? customDescription : `Payment from ${clientName} for Invoice #${invoiceId.split('-')[0].toUpperCase()}`;

  const { error: incomeError } = await supabase.from("income").insert([{
    business_id: businessId, invoice_id: invoiceId, amount: amount, date: date, account_id: accountId, category_id: revCategory?.id, description: finalDescription, reference_number: reference, created_by: user.id
  }]);

  if (incomeError) throw new Error(incomeError.message);

  const { data: invoice } = await supabase.from("invoices").select("total_amount").eq("id", invoiceId).single();
  const { data: payments } = await supabase.from("income").select("amount").eq("invoice_id", invoiceId);
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const newStatus = totalPaid >= Number(invoice?.total_amount) ? "paid" : "partially_paid";

  await supabase.from("invoices").update({ status: newStatus }).eq("id", invoiceId);

  const displayId = invoiceId.split('-')[0].toUpperCase();

  await logSecurityEvent({
    businessId: businessId as string, actorId: user.id, action: "RECORDED_INVOICE_PAYMENT", tableName: "invoices", recordId: invoiceId,
    details: { invoice_number: displayId, amount_paid: amount, new_status: newStatus }
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

// ============================================================================
// 5. UPDATE INVOICE PAYMENT
// ============================================================================
export async function updateInvoicePayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  if (!profile?.business_id) throw new Error("No business found");

  const payment_id = formData.get("payment_id") as string;
  const invoice_id = formData.get("invoice_id") as string;
  const client_name = formData.get("client_name") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const date = formData.get("date") as string;
  const description = formData.get("description") as string;
  const old_amount = formData.get("old_amount") as string;

  if (isNaN(amount) || amount <= 0) throw new Error("Payment amount must be greater than zero.");

  const { error } = await supabase.from("income").update({ amount: amount, date: date, description: description }).eq("id", payment_id).eq("business_id", profile.business_id);
  if (error) throw new Error(error.message);

  const { data: invoice } = await supabase.from("invoices").select("total_amount").eq("id", invoice_id).single();
  const { data: payments } = await supabase.from("income").select("amount").eq("invoice_id", invoice_id);
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  
  let newStatus = "sent";
  if (totalPaid >= Number(invoice?.total_amount)) newStatus = "paid";
  else if (totalPaid > 0) newStatus = "partially_paid";

  await supabase.from("invoices").update({ status: newStatus }).eq("id", invoice_id);

  const displayId = invoice_id.split('-')[0].toUpperCase();

  await logSecurityEvent({
    businessId: profile.business_id, actorId: user.id, action: "EDITED_PAYMENT", tableName: "income", recordId: payment_id,
    details: { invoice_number: displayId, client: client_name, old_amount: old_amount, new_amount: amount.toString(), reason: "Staff manually edited a posted payment record." }
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice_id}`);
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

// ============================================================================
// 6. DELETE INVOICE PAYMENT (OWNERS ONLY)
// ============================================================================
export async function deleteInvoicePayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  if (!profile?.business_id) throw new Error("No business found");

  if (profile.role !== 'business_owner' && profile.role !== 'super_admin') {
    throw new Error("Security Violation: Only Business Owners can void a posted payment.");
  }

  const payment_id = formData.get("payment_id") as string;
  const invoice_id = formData.get("invoice_id") as string;
  const old_amount = formData.get("old_amount") as string;
  const void_reason = formData.get("void_reason") as string || "Owner forced deletion."; 

  const { error } = await supabase.from("income").delete().eq("id", payment_id).eq("business_id", profile.business_id);
  if (error) throw new Error(error.message);

  const { data: invoice } = await supabase.from("invoices").select("total_amount").eq("id", invoice_id).single();
  const { data: payments } = await supabase.from("income").select("amount").eq("invoice_id", invoice_id);
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  
  let newStatus = "sent";
  if (totalPaid >= Number(invoice?.total_amount)) newStatus = "paid";
  else if (totalPaid > 0) newStatus = "partially_paid";

  await supabase.from("invoices").update({ status: newStatus }).eq("id", invoice_id);

  const displayId = invoice_id.split('-')[0].toUpperCase();

  await logSecurityEvent({
    businessId: profile.business_id, actorId: user.id, action: "DELETED_PAYMENT", tableName: "income", recordId: payment_id,
    details: { invoice_number: displayId, voided_amount: old_amount, reason: void_reason }
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice_id}`);
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

// ============================================================================
// 7. REQUEST PAYMENT VOID (THE MAKER)
// ============================================================================
export async function requestPaymentVoid(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  if (!profile?.business_id) throw new Error("No business found");

  const payment_id = formData.get("payment_id") as string;
  const invoice_id = formData.get("invoice_id") as string;
  const void_reason = formData.get("void_reason") as string;

  const { error } = await supabase.from("payment_void_requests").insert([{
    business_id: profile.business_id,
    payment_id,
    invoice_id,
    requested_by: user.id,
    reason: void_reason,
    status: 'pending'
  }]);

  if (error) throw new Error(error.message);

  const displayId = invoice_id.split('-')[0].toUpperCase();

  await logSecurityEvent({
    businessId: profile.business_id, actorId: user.id, action: "REQUESTED_PAYMENT_VOID", tableName: "payment_void_requests", recordId: payment_id,
    details: { invoice_number: displayId, reason: void_reason }
  });
}

// ============================================================================
// 8. RESOLVE PAYMENT VOID (THE CHECKER)
// ============================================================================
export async function resolvePaymentVoid(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') throw new Error("Unauthorized");

  const request_id = formData.get("request_id") as string;
  const action = formData.get("action") as string; // 'approve' or 'reject'

  const { data: voidRequest } = await supabase.from("payment_void_requests").select("*").eq("id", request_id).single();
  if (!voidRequest) throw new Error("Request not found");

  await supabase.from("payment_void_requests").update({ status: action === 'approve' ? 'approved' : 'rejected' }).eq("id", request_id);

  if (action === 'approve') {
    await supabase.from("income").delete().eq("id", voidRequest.payment_id);
    
    const { data: invoice } = await supabase.from("invoices").select("total_amount").eq("id", voidRequest.invoice_id).single();
    const { data: payments } = await supabase.from("income").select("amount").eq("invoice_id", voidRequest.invoice_id);
    const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    
    let newStatus = "sent";
    if (totalPaid >= Number(invoice?.total_amount)) newStatus = "paid";
    else if (totalPaid > 0) newStatus = "partially_paid";
    
    await supabase.from("invoices").update({ status: newStatus }).eq("id", voidRequest.invoice_id);
  }

  const displayId = voidRequest.invoice_id.split('-')[0].toUpperCase();

  await logSecurityEvent({
    businessId: profile?.business_id as string, actorId: user.id, action: action === 'approve' ? "APPROVED_PAYMENT_VOID" : "REJECTED_PAYMENT_VOID", tableName: "income", recordId: voidRequest.payment_id,
    details: { invoice_number: displayId, request_id, original_reason: voidRequest.reason }
  });

  revalidatePath(`/invoices/${voidRequest.invoice_id}`);
}