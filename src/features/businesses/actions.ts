// src/features/businesses/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function provisionTenant(formData: FormData) {
  const businessName = formData.get("business_name") as string;
  const currency = formData.get("currency") as string;

  const supabase = await createClient();

  // 1. Verify Authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Authentication required to provision a tenant." };
  }

  // 2. Insert the Business (Locked to 'pending' by default)
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

  if (bizError) {
    return { error: bizError.message };
  }

  // 3. Link the Profile to the new Business
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ business_id: business.id })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  // -------------------------------------------------------------------
  // 4. CACHE PURGE: Wipe the Next.js memory so Layout sees the new ID!
  // -------------------------------------------------------------------
  revalidatePath("/", "layout");

  // 5. Send the user to the core application
  redirect("/dashboard");
}

export async function approveBusiness(businessId: string) {
  const supabase = await createClient();
  
  // 1. Cryptographic check: Ensure the caller is actually a Super Admin
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

  // 2. Execute the mutation
  const { error } = await supabase
    .from("businesses")
    .update({ status: "active" })
    .eq("id", businessId);

  if (error) return { error: error.message };

  // 3. Purge the Next.js router cache to update the UI instantly
  revalidatePath("/clients");
}