// src/features/accounts/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAccount(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Fetch the user's business_id from their profile securely on the server
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) {
    return { error: "No active business found." };
  }

  // 2. Insert the new account
  const { error } = await supabase
    .from("accounts")
    .insert({
      business_id: profile.business_id,
      name: name,
      category: category,
    });

  if (error) return { error: error.message };

  // 3. Purge the cache so the UI updates instantly
  revalidatePath("/accounts");
}