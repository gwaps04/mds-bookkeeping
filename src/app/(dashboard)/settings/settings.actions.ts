// FILE: src/app/(dashboard)/settings/settings.actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function getTenantApiKeyAction() {
  try {
    const supabase = await createClient();
    
    // 1. Authenticate User
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Unauthorized" };

    // 2. Get Business ID from Profile (Matching your existing architecture)
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) return { success: false, error: "No business linked to profile" };

    // 3. Fetch API Key from Businesses Table
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("api_key")
      .eq("id", profile.business_id)
      .single();

    if (bizError || !business) return { success: false, error: "Could not fetch business API key" };

    return { 
      success: true, 
      businessId: profile.business_id,
      apiKey: business.api_key 
    };
  } catch (error: any) {
    console.error("[Macrobiz Action Error - API Key]:", error);
    return { success: false, error: error.message };
  }
}