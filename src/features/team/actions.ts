// src/features/team/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function inviteStaff(formData: FormData) {
  const email = formData.get("email") as string;
  const fullName = formData.get("full_name") as string;
  // Temporary default password for the new staff member
  const tempPassword = "StaffPassword123!"; 

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Verify the caller is actually a Business Owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "business_owner" || !profile?.business_id) {
    throw new Error("Insufficient privileges.");
  }

  // --- NEW: THE 1-STAFF LIMIT RULE ---
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: 'exact', head: true })
    .eq("business_id", profile.business_id)
    .eq("role", "staff");

  if (count && count >= 1) {
    throw new Error("Plan Limit Reached: You are only allowed 1 staff member.");
  }

  // 1. ESCALATION: Create the user in Auth
  const adminAuthClient = createAdminClient();
  
  const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
    email: email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authError) throw new Error(authError.message);

  // 2. ASSIGNMENT: Link them to the Business Owner's ledger
  const { error: profileUpdateError } = await adminAuthClient
    .from("profiles")
    .update({ 
      role: "staff", 
      business_id: profile.business_id,
      full_name: fullName
    })
    .eq("id", authData.user.id);

  if (profileUpdateError) {
    // Cleanup if linking fails
    await adminAuthClient.auth.admin.deleteUser(authData.user.id);
    throw new Error("Failed to assign tenant to user.");
  }

  revalidatePath("/team");
}