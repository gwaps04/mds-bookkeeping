// src/features/refunds/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function processRefundRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const invoice_id = formData.get("invoice_id") as string;
  const amount = Number(formData.get("amount"));
  const reason = formData.get("reason") as string;

  // 1. Identify who is asking
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';
  const status = isOwner ? 'approved' : 'pending'; // Auto-approve if Owner!
  const approved_by = isOwner ? user.id : null;

  // 2. Log the request
  const { data: refund, error: refundError } = await supabase.from("refund_requests").insert({
    business_id: profile?.business_id,
    invoice_id,
    requested_by: user.id,
    approved_by,
    amount,
    reason,
    status
  }).select().single();

  if (refundError) throw new Error(refundError.message);

  // 3. IF AUTO-APPROVED (Owner), instantly deduct cash via Contra-Entry
  if (isOwner && refund) {
    await supabase.from("expenses").insert({
      business_id: profile?.business_id,
      amount,
      date: new Date().toISOString().split('T')[0],
      description: `REFUND ISSUED: ${reason}`,
      status: 'paid',
      created_by: user.id
    });
  }

  revalidatePath("/", "layout");
}

export async function reviewRefund(refundId: string, action: 'approve' | 'reject') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch the refund
  const { data: refund } = await supabase.from("refund_requests").select("*").eq("id", refundId).single();
  if (!refund || refund.status !== 'pending') return;

  if (action === 'reject') {
    await supabase.from("refund_requests").update({ status: 'rejected', approved_by: user.id }).eq("id", refundId);
  } 
  
  if (action === 'approve') {
    // 1. Mark Approved
    await supabase.from("refund_requests").update({ status: 'approved', approved_by: user.id }).eq("id", refundId);
    
    // 2. Generate Contra-Entry Expense (Deducts from Net Cash)
    await supabase.from("expenses").insert({
      business_id: refund.business_id,
      amount: refund.amount,
      date: new Date().toISOString().split('T')[0],
      description: `REFUND APPROVED: ${refund.reason}`,
      status: 'paid',
      created_by: user.id
    });
  }

  revalidatePath("/", "layout");
}