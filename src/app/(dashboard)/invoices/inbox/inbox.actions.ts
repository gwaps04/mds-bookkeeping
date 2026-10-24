// FILE: src/app/(dashboard)/invoices/inbox/inbox.actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function dismissInboxItemAction(formData: FormData) {
  try {
    const itemId = formData.get("itemId") as string;
    if (!itemId) throw new Error("No Item ID provided");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch user's business ID to ensure they own the item
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) throw new Error("No business found");

    // Securely update the status to DISMISSED
    const { error } = await supabase
      .from("crm_inbox")
      .update({ status: 'DISMISSED' })
      .eq("id", itemId)
      .eq("business_id", profile.business_id); // RLS enforcement check

    if (error) throw new Error(error.message);

    revalidatePath("/invoices/inbox");
  } catch (error: any) {
    console.error("[Dismiss Inbox Item Error]:", error);
  }
}