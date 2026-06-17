// src/features/settings/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateTaxSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. SECURITY CHECK: Verify caller is the Business Owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "business_owner") {
    throw new Error("Security Violation: Only business owners can change global settings.");
  }

  // 2. Extract Data
  // Checkboxes return "on" if checked, and null if unchecked
  const isTaxRegistered = formData.get("is_tax_registered") === "on"; 
  const taxId = formData.get("tax_id") as string;

  // 3. UPDATE THE BUSINESS RECORD
  const { error } = await supabase
   .from("businesses")
    .update({
      is_tax_registered: isTaxRegistered,
      tax_id: taxId || null // Keep the TIN saved in the database even if toggled off!
    })
    .eq("id", profile.business_id);

  if (error) {
    console.error("Failed to update settings:", error);
    throw new Error(error.message);
  }

  // 4. REFRESH CACHES
  revalidatePath("/settings");
  revalidatePath("/layout"); // This will eventually trigger the new sidebar link to appear!
}