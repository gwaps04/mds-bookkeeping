// src/features/admin/actions.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function approveBusiness(formData: FormData) {
  const businessId = formData.get("business_id") as string;
  
  const adminAuthClient = createAdminClient();

  // 1. APPROVE THE BUSINESS
  const { error: updateError } = await adminAuthClient
    .from("businesses")
    .update({ status: 'active' })
    .eq("id", businessId);

  if (updateError) {
    console.error("Failed to approve business:", updateError);
    throw new Error(updateError.message);
  }

  // 2. SECURITY CHECK: Ensure we don't inject duplicates if clicked twice
  const { data: existingAccounts } = await adminAuthClient
    .from("accounts")
    .select("id")
    .eq("business_id", businessId)
    .limit(1);

  if (!existingAccounts || existingAccounts.length === 0) {
    
    // 3. THE "STARTER KIT" ACCOUNT INJECTION
    const defaultAccounts = [
      
      // --- PART 1: INCOME & SALES DEFAULTS (Assets & Revenue) ---
      { business_id: businessId, name: "Petty Cash / Register", type: "asset", category: "Cash" },
      { business_id: businessId, name: "GCash", type: "asset", category: "E-Wallet" },
      { business_id: businessId, name: "BDO Unibank", type: "asset", category: "Bank Account" },
      { business_id: businessId, name: "General Sales / Retail", type: "revenue", category: "Operating Revenue" },
      { business_id: businessId, name: "Service Income", type: "revenue", category: "Operating Revenue" },

      // --- PART 2: EXPENSE DEFAULTS (Expenses & Liabilities) ---
      { business_id: businessId, name: "Rent & Lease", type: "expense", category: "Operating Expense" },
      { business_id: businessId, name: "Utilities (Water, Power)", type: "expense", category: "Operating Expense" },
      { business_id: businessId, name: "Salaries & Wages", type: "expense", category: "Payroll" },
      { business_id: businessId, name: "Inventory / Cost of Goods", type: "expense", category: "Cost of Goods Sold" },
      { business_id: businessId, name: "Taxes, Licenses & Fees", type: "expense", category: "Financial" }
    ];

    // Bulk Insert the Starter Kit
    const { error: insertError } = await adminAuthClient
      .from("accounts")
      .insert(defaultAccounts);

    if (insertError) {
      console.error("Failed to inject default accounts:", insertError);
    }
  }

  // 4. REFRESH SUPER ADMIN DASHBOARD
  revalidatePath("/admin/businesses");
}