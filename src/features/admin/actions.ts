// src/features/admin/actions.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ============================================================================
// 1. APPROVE BUSINESS & INJECT DEFAULT ACCOUNTS
// ============================================================================
export async function approveBusiness(formData: FormData) {
  const businessId = formData.get("business_id") as string;
  
  const adminAuthClient = createAdminClient();

  const { error: updateError } = await adminAuthClient
    .from("businesses")
    .update({ status: 'active' })
    .eq("id", businessId);

  if (updateError) {
    console.error("Failed to approve business:", updateError);
    throw new Error(updateError.message);
  }

  const { data: existingAccounts } = await adminAuthClient
    .from("accounts")
    .select("id")
    .eq("business_id", businessId)
    .limit(1);

  if (!existingAccounts || existingAccounts.length === 0) {
    const defaultAccounts = [
      { business_id: businessId, name: "Petty Cash / Register", type: "asset", category: "Cash" },
      { business_id: businessId, name: "GCash", type: "asset", category: "E-Wallet" },
      { business_id: businessId, name: "BDO Unibank", type: "asset", category: "Bank Account" },
      { business_id: businessId, name: "General Sales / Retail", type: "revenue", category: "Operating Revenue" },
      { business_id: businessId, name: "Service Income", type: "revenue", category: "Operating Revenue" },
      { business_id: businessId, name: "Rent & Lease", type: "expense", category: "Operating Expense" },
      { business_id: businessId, name: "Utilities (Water, Power)", type: "expense", category: "Operating Expense" },
      { business_id: businessId, name: "Salaries & Wages", type: "expense", category: "Payroll" },
      { business_id: businessId, name: "Inventory / Cost of Goods", type: "expense", category: "Cost of Goods Sold" },
      { business_id: businessId, name: "Taxes, Licenses & Fees", type: "expense", category: "Financial" }
    ];

    const { error: insertError } = await adminAuthClient.from("accounts").insert(defaultAccounts);
    if (insertError) console.error("Failed to inject default accounts:", insertError);
  }

  revalidatePath("/admin/businesses");
}

// ============================================================================
// 2. TOGGLE ERP INVENTORY ACCESS (Legacy support)
// ============================================================================
export async function toggleInventoryAccess(formData: FormData) {
  const adminAuthClient = createAdminClient();
  const businessId = formData.get("business_id") as string;
  const hasAccess = formData.get("has_access") === "true";

  const { error } = await adminAuthClient
    .from("businesses")
    .update({ has_inventory_access: hasAccess })
    .eq("id", businessId);

  if (error) throw new Error(error.message);
  
  revalidatePath("/admin/businesses");
}

// ============================================================================
// 3. THE UNIFIED SAAS PROVISIONING ENGINE (Payroll, Inventory, Receipts, Planner, Reports)
// ============================================================================
export async function updateWorkspaceAccess(formData: FormData) {
  const adminAuthClient = createAdminClient(); // Uses the secure Service Role!

  const businessId = formData.get("business_id") as string;
  const feature = formData.get("feature") as string; 
  const action = formData.get("action") as string; // 'enable' or 'disable'

  if (!businessId || !feature || !action) throw new Error("Missing required fields");

  const isEnabled = action === "enable";

  // Map the requested feature to the exact database column
  let updateData: any = {};
  if (feature === "payroll") {
    updateData = { has_payroll_access: isEnabled };
  } else if (feature === "inventory") {
    updateData = { has_inventory_access: isEnabled };
  } else if (feature === "receipts") {
    updateData = { allow_receipt_uploads: isEnabled };
  } else if (feature === "planner") {
    updateData = { has_planner_access: isEnabled };
  } else if (feature === "reports") {
    updateData = { has_reports_access: isEnabled };
  } else {
    throw new Error("Invalid feature requested.");
  }

  const { error } = await adminAuthClient
    .from("businesses")
    .update(updateData)
    .eq("id", businessId);

  if (error) throw new Error("Database Error: " + error.message);

  revalidatePath("/admin/businesses");
}