// src/features/invoices/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createInvoice(formData: FormData) {
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
  const client_name = formData.get("client_name") as string;
  const due_date = formData.get("due_date") as string;
  const description = formData.get("description") as string;
  const quantity = Number(formData.get("quantity") || 1);
  const unit_price = Number(formData.get("unit_price") || 0);

  // Calculate the total math on the server so it can't be tampered with
  const total_price = quantity * unit_price;

  // 1. CREATE THE INVOICE HEADER
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert([{
      business_id,
      client_name,
      due_date,
      status: 'sent', // Defaulting to 'sent' for the MVP
      total_amount: total_price
    }])
    .select("id")
    .single();

  if (invoiceError) throw new Error(invoiceError.message);

  // 2. CREATE THE INVOICE LINE ITEM
  const { error: itemError } = await supabase
    .from("invoice_items")
    .insert([{
      invoice_id: invoice.id,
      description,
      quantity,
      unit_price,
      total_price
    }]);

  if (itemError) throw new Error(itemError.message);

  // 3. REFRESH CACHES
  revalidatePath("/invoices");
  revalidatePath("/dashboard"); // This will wake up the "Unpaid Invoices" counter!
}