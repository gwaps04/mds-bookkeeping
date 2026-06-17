// src/features/invoices/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  // 5. REFRESH & REDIRECT TO THE PRINTABLE PDF
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}