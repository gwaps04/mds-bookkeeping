// src/features/admin/actions.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function approveBusiness(formData: FormData) {
  const businessId = formData.get("business_id") as string;
  
  // We use the Admin Client to bypass RLS for system-level overrides
  const adminAuthClient = createAdminClient();

  const { error } = await adminAuthClient
    .from("businesses")
    .update({ status: 'active' }) // Changes status from 'pending' to 'active'
    .eq("id", businessId);

  if (error) {
    console.error("Failed to approve business:", error);
    throw new Error(error.message);
  }

  // Refresh the Super Admin dashboard
  revalidatePath("/admin/businesses");
}