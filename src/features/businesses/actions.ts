// src/features/businesses/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logSecurityEvent } from "@/lib/audit"; // <-- IMPORTED THE AUDIT LOGGER

// ============================================================================
// 1. PROVISION TENANT (Upgraded with Address & Telemetry)
// ============================================================================
export async function provisionTenant(formData: FormData) {
  const businessName = formData.get("business_name") as string;
  const currency = formData.get("currency") as string;
  const businessAddress = formData.get("business_address") as string; 
  
  // 1. Extract Telemetry Data
  const industry = formData.get("industry") as string;
  const employeeCount = formData.get("employee_count") as string;
  const featuresRaw = formData.get("requested_features") as string;
  
  // 2. Safely parse the JSON array of checkboxes
  let requestedFeatures: string[] = [];
  try {
    if (featuresRaw) requestedFeatures = JSON.parse(featuresRaw);
  } catch (err) {
    console.error("Failed to parse requested features:", err);
  }

  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Authentication required to provision a tenant." };
  }

  // 3. Inject core, address, and telemetry data into the database
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      business_name: businessName,
      currency: currency || "PHP",
      address: businessAddress || null, 
      status: "pending",
      industry: industry || null,
      employee_count: employeeCount || null,
      requested_features: requestedFeatures
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return { error: "Forbidden: Only Super Admins can alter tenant limits." };
    }

    if (newLimit < 0) return { error: "Staff limit cannot be less than 0." };

    const { error: updateError } = await supabase
      .from("businesses")
      .update({ max_staff_limit: newLimit })
      .eq("id", businessId);

    if (updateError) throw updateError;

    revalidatePath("/admin/businesses"); 
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update tenant configuration." };
  }
}

// ============================================================================
// 4. CREATE NEW ORGANIZATION (SaaS Limit Firewall)
// ============================================================================
export async function createOrganization(formData: FormData) {
  const businessName = formData.get("business_name") as string;
  const currency = (formData.get("currency") as string) || "PHP";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

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

  const { data: targetBusiness, error: checkError } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", targetBusinessId)
    .eq("owner_id", user.id)
    .single();

  if (checkError || !targetBusiness) {
    return { error: "You do not have access to this organization." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ business_id: targetBusiness.id })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

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

// ============================================================================
// 7. TOGGLE BUSINESS FEATURE (Super Admin Only)
// ============================================================================
export async function toggleBusinessFeature(businessId: string, featureColumn: string, newValue: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Security Check: Only Super Admins can toggle features
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== 'super_admin') {
    throw new Error("Security Violation: Only Super Admins can modify tenant features.");
  }

  // Prevent SQL injection by strictly matching allowed columns
  const allowedFeatures = ['allow_receipt_uploads', 'allow_staff_account_creation', 'allow_staff_payment_logging', 'show_net_cash_to_staff', 'show_taxes_to_staff', 'allow_staff_refund_request'];
  if (!allowedFeatures.includes(featureColumn)) {
    throw new Error("Invalid feature column.");
  }

  const { error } = await supabase
    .from("businesses")
    .update({ [featureColumn]: newValue })
    .eq("id", businessId);

  if (error) throw new Error(error.message);

  // Log the action for Enterprise auditing
  await logSecurityEvent({
    businessId,
    actorId: user.id,
    action: "TOGGLED_TENANT_FEATURE",
    tableName: "businesses",
    recordId: businessId,
    details: { feature: featureColumn, newValue }
  });

  revalidatePath("/admin/businesses");
}