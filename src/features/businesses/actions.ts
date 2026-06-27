// src/features/businesses/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ============================================================================
// 1. PROVISION TENANT (For new Business Owners signing up)
// ============================================================================
export async function provisionTenant(formData: FormData) {
  const businessName = formData.get("business_name") as string;
  const currency = formData.get("currency") as string;

  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Authentication required to provision a tenant." };
  }

  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      business_name: businessName,
      currency: currency || "PHP",
      status: "pending" 
    })
    .select("id")
    .single();

  if (bizError) return { error: bizError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ business_id: business.id })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ============================================================================
// 2. APPROVE TENANT (Super Admin Only)
// ============================================================================
export async function approveBusiness(formData: FormData) {
  const businessId = formData.get("business_id") as string;
  if (!businessId) return { error: "Missing business ID" };

  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
    
  if (profile?.role !== "super_admin") {
    return { error: "Insufficient privileges." };
  }

  const { error } = await supabase
    .from("businesses")
    .update({ status: "active" })
    .eq("id", businessId);

  if (error) return { error: error.message };

  // Revalidate the correct Super Admin approvals path
  revalidatePath("/admin/businesses");
}

// ============================================================================
// 3. UPDATE TENANT STAFF LIMIT (Super Admin Only)
// ============================================================================
export async function updateTenantStaffLimit(businessId: string, newLimit: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    // Security Check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { error: "Forbidden: Only Super Admins can alter tenant limits." };
    }

    // Validation
    if (newLimit < 0) {
      return { error: "Staff limit cannot be less than 0." };
    }

    // Update the database
    const { error: updateError } = await supabase
      .from("businesses")
      .update({ max_staff_limit: newLimit })
      .eq("id", businessId);

    if (updateError) throw updateError;

    // Force the Super Admin table to refresh and show the new number!
    revalidatePath("/admin/businesses"); 

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update tenant configuration." };
  }
}