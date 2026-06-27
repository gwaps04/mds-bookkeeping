// src/features/super-admin/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateTenantStaffLimit(businessId: string, newLimit: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    // 1. SECURITY CHECK: Ensure caller is a Super Admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { error: "Forbidden: Only Super Admins can alter tenant limits." };
    }

    // 2. VALIDATION: Prevent negative staff limits
    if (newLimit < 0) {
      return { error: "Staff limit cannot be less than 0." };
    }

    // 3. EXECUTE: Update the business record
    const { error: updateError } = await supabase
      .from("businesses")
      .update({ max_staff_limit: newLimit })
      .eq("id", businessId);

    if (updateError) throw updateError;

    // 4. REVALIDATE: Force the page to fetch the fresh numbers instantly
    // (Update this path to wherever your Super Admin table is located)
    revalidatePath("/tenant-approvals"); 

    return { success: true };
  } catch (err: any) {
    console.error("Failed to update staff limit:", err);
    return { error: err.message || "Failed to update tenant configuration." };
  }
}