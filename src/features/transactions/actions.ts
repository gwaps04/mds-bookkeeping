// src/features/transactions/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function recordTransaction(formData: FormData) {
  const accountId = formData.get("account_id") as string;
  const type = formData.get("type") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;
  const date = formData.get("transaction_date") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return { error: "No active business found." };

  const { error } = await supabase
    .from("transactions")
    .insert({
      business_id: profile.business_id,
      account_id: accountId,
      type: type,
      amount: amount,
      description: description,
      transaction_date: date
    });

  if (error) return { error: error.message };

  // Purge the cache for both transactions AND the dashboard (for future totals)
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}