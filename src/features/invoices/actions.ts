// src/features/invoices/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createInvoice(formData: FormData) {
  const clientName = formData.get("client_name") as string;
  const dueDate = formData.get("due_date") as string;
  const description = formData.get("description") as string;
  const quantity = parseInt(formData.get("quantity") as string);
  const unitPrice = parseFloat(formData.get("unit_price") as string);
  
  const totalPrice = quantity * unitPrice;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No active business found." };

  // DANCE STEP 1: Insert the Parent Invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      business_id: profile.business_id,
      client_name: clientName,
      due_date: dueDate,
      status: "draft",
      total_amount: totalPrice
    })
    .select("id")
    .single();

  if (invoiceError) return { error: invoiceError.message };

  // DANCE STEP 2: Insert the Child Line Item using the Parent's ID
  const { error: itemError } = await supabase
    .from("invoice_items")
    .insert({
      invoice_id: invoice.id,
      description: description,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice
    });

  if (itemError) return { error: itemError.message };

  // DANCE STEP 3: Purge the cache
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}