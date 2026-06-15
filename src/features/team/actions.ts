// src/features/team/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function inviteStaff(formData: FormData) {
  const email = formData.get("email") as string;
  const fullName = formData.get("full_name") as string;
  // In a real app, you'd generate a random password and email it to them.
  // For this architecture build, we'll set a default password.
  const tempPassword = "StaffPassword123!"; 

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

  // 1. ESCALATION: Use the Admin Client to bypass RLS and create the user
  const adminAuthClient = createAdminClient();
  
  const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
    email: email,
    password: tempPassword,
    email_confirm: true, // Auto-confirm since we turned off email verifications
    user_metadata: { full_name: fullName }
  });

  if (authError) return { error: authError.message };

  // 2. ASSIGNMENT: Update their profile to link them to the Business and set the Staff role
  const { error: profileUpdateError } = await adminAuthClient
    .from("profiles")
    .update({ 
      role: "staff", 
      business_id: profile.business_id,
      full_name: fullName
    })
    .eq("id", authData.user.id);

  if (profileUpdateError) {
    // If linking fails, clean up the ghost auth user
    await adminAuthClient.auth.admin.deleteUser(authData.user.id);
    return { error: "Failed to assign tenant to user." };
  }

  revalidatePath("/team");
}