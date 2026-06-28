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

// ============================================================================
// 4. CREATE NEW ORGANIZATION (Now protected by SaaS Limits)
// ============================================================================
export async function createOrganization(formData: FormData) {
  const businessName = formData.get("business_name") as string;
  const currency = (formData.get("currency") as string) || "PHP";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // --- 1. THE SAAS LIMIT FIREWALL ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("max_businesses_limit")
    .eq("id", user.id)
    .single();

  const { count } = await supabase
    .from("businesses")
    .select("*", { count: 'exact', head: true })
    .eq("owner_id", user.id);

  const limit = profile?.max_businesses_limit || 1;

  if (count !== null && count >= limit) {
    return { error: `Plan Limit Reached: You are only permitted to manage ${limit} organization(s). Please contact a Super Admin to upgrade your account tier.` };
  }
  // ----------------------------------

  // 2. Insert the new business into the database
  const { data: newBusiness, error: bizError } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      business_name: businessName,
      currency: currency,
      status: "active" 
    })
    .select("id")
    .single();

  if (bizError) return { error: bizError.message };

  // 3. Automatically switch their active context
  await supabase
    .from("profiles")
    .update({ business_id: newBusiness.id })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  return { success: true };
}

// ============================================================================
// 5. SWITCH ACTIVE ORGANIZATION
// ============================================================================
export async function switchOrganization(targetBusinessId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Security Check: Verify they actually own this business before switching
  const { data: targetBusiness, error: checkError } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", targetBusinessId)
    .eq("owner_id", user.id)
    .single();

  if (checkError || !targetBusiness) {
    return { error: "You do not have access to this organization." };
  }

  // 2. Update their profile to point to the new business
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ business_id: targetBusiness.id })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  // 3. Refresh the entire layout to load the new company's data
  revalidatePath("/", "layout");
  return { success: true };
}

// ============================================================================
// 6. UPDATE OWNER ORGANIZATION LIMIT (Super Admin Only)
// ============================================================================
export async function updateOwnerOrgLimit(ownerId: string, newLimit: number) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { error: "Forbidden: Only Super Admins can alter account tier limits." };
    }

    if (newLimit < 1) return { error: "A user must be allowed at least 1 organization." };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ max_businesses_limit: newLimit })
      .eq("id", ownerId);

    if (updateError) throw updateError;

    revalidatePath("/admin/businesses");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update organization limit." };
  }
}