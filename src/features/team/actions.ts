// src/features/team/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { logSecurityEvent } from "@/lib/audit";

// --- THE SECURE PASSWORD GENERATOR ---
function generateSecurePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let pass = "Mds-"; // Prefix for brand recognition
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

// ============================================================================
// 1. PROVISION STAFF ACCOUNT
// ============================================================================
export async function provisionStaffAccount(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    // Look for "name" (from new UI) or "full_name" (from old UI) to be safe
    const fullName = (formData.get("name") || formData.get("full_name")) as string; 
    
    // Auto-generate the cryptographically secure password
    const tempPassword = generateSecurePassword(); 

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    // Verify the caller is actually a Business Owner
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, business_id")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "business_owner" || !profile?.business_id) {
      return { error: "Insufficient privileges." };
    }

    // --- YOUR CUSTOM RULE: THE 1-STAFF LIMIT ---
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: 'exact', head: true })
      .eq("business_id", profile.business_id)
      .eq("role", "staff");

    if (count && count >= 1) {
      return { error: "Plan Limit Reached: You are only allowed 1 staff member. Please upgrade your plan." };
    }

    // 1. ESCALATION: Create the user in Auth
    const adminAuthClient = createAdminClient();
    
    const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) return { error: authError.message };
    if (!authData.user) return { error: "Failed to generate auth record." };

    // 2. ASSIGNMENT: Link them to the Business Owner's ledger
    const { error: profileUpdateError } = await adminAuthClient
      .from("profiles")
      .update({ 
        role: "staff", 
        business_id: profile.business_id,
        full_name: fullName
      })
      .eq("id", authData.user.id);

    // YOUR CLEANUP LOGIC (Prevents ghost accounts)
    if (profileUpdateError) {
      await adminAuthClient.auth.admin.deleteUser(authData.user.id);
      return { error: "Failed to assign tenant to user. Changes rolled back." };
    }

    // 3. LOG THE SECURITY EVENT
    try {
      await logSecurityEvent({
        businessId: profile.business_id as string, actorId: user.id, action: "PROVISIONED_STAFF", tableName: "profiles", recordId: authData.user.id, details: { staff_email: email }
      });
    } catch (e) {
      console.error("Audit log failed, continuing...", e);
    }

    revalidatePath("/team");
    
    // RETURN SUCCESS TO THE FRONT-END SO IT CAN SHOW THE GREEN PASSWORD BOX!
    return { success: true, password: tempPassword, email: email };

  } catch (err: any) {
    return { error: err.message || "An unexpected server error occurred." };
  }
}

// ============================================================================
// 2. RESET STAFF PASSWORD
// ============================================================================
export async function resetStaffPassword(userId: string, email: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single();
    if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') return { error: "Forbidden" };

    const newPassword = generateSecurePassword();
    
    const adminAuthClient = createAdminClient();

    // RESET PASSWORD VIA ADMIN API
    const { error } = await adminAuthClient.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) return { error: error.message };

    try {
      await logSecurityEvent({
        businessId: profile.business_id as string, actorId: user.id, action: "RESET_STAFF_PASSWORD", tableName: "profiles", recordId: userId, details: { staff_email: email }
      });
    } catch (e) {
      console.error("Audit log failed...", e);
    }

    return { success: true, password: newPassword };
  } catch (err: any) {
    return { error: err.message || "Failed to reset password." };
  }
}