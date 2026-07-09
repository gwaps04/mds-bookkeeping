// src/features/planner/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// SECURITY GUARD: Verifies user is an Owner or Super Admin
// ============================================================================
async function verifyOwnerAccess(supabase: any, userId: string) {
  const { data: profile } = await supabase.from("profiles").select("role, business_id").eq("id", userId).single();
  if (!profile || (profile.role !== 'business_owner' && profile.role !== 'super_admin')) {
    throw new Error("Unauthorized: Strategic Planner is restricted to Business Owners.");
  }
  return profile;
}

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const profile = await verifyOwnerAccess(supabase, user.id);
  
  const title = formData.get("title") as string;
  const description = formData.get("description") as string; 
  const targetDate = formData.get("target_date") as string;
  const budget = parseFloat(formData.get("budget_allocation") as string) || 0;

  const { error } = await supabase.from("business_goals").insert([{
    business_id: profile.business_id,
    created_by: user.id,
    title,
    description,
    target_date: targetDate || null,
    budget_allocation: budget,
    status: 'PLANNED'
  }]);

  if (error) throw new Error(error.message);
  revalidatePath("/planner");
}

export async function updateGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  await verifyOwnerAccess(supabase, user.id);

  const goalId = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;
  const targetDate = formData.get("target_date") as string;
  const budget = parseFloat(formData.get("budget_allocation") as string) || 0;

  const { error } = await supabase
    .from("business_goals")
    .update({ 
      title, 
      description, 
      status, 
      target_date: targetDate || null, 
      budget_allocation: budget,
      updated_at: new Date().toISOString()
    })
    .eq("id", goalId);

  if (error) throw new Error(error.message);
  revalidatePath("/planner");
}

export async function deleteGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  await verifyOwnerAccess(supabase, user.id);
  
  const goalId = formData.get("id") as string;

  const { error } = await supabase.from("business_goals").delete().eq("id", goalId);

  if (error) throw new Error(error.message);
  revalidatePath("/planner");
}