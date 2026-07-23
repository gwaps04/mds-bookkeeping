// src/features/inventory/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// THE GATEKEEPER: ZERO-TRUST ACTION GUARD
// ============================================================================
async function verifyInventoryAccess(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      role, 
      business_id, 
      can_access_inventory,
      businesses(has_inventory_access)
    `)
    .eq("id", userId)
    .single();

  if (!profile) throw new Error("Profile not found.");

  const isSuperAdmin = profile.role === 'super_admin';
  const isOwner = profile.role === 'business_owner' || isSuperAdmin;
  const bizData = Array.isArray(profile.businesses) ? profile.businesses[0] : profile.businesses;
  const bizHasInventory = bizData?.has_inventory_access === true;

  // Key 1: Business Subscription Check
  if (!bizHasInventory && !isSuperAdmin) {
    throw new Error("Security Violation: This business does not have an active Inventory subscription.");
  }

  // Key 2: User RBAC Check
  if (!isOwner && profile.can_access_inventory !== true) {
    throw new Error("Unauthorized: You do not have explicit clearance to modify the Inventory ledger.");
  }

  return profile.business_id;
}

// ============================================================================
// 1. CREATE NEW ITEM (Catalog & Recipes)
// ============================================================================
export async function createItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const businessId = await verifyInventoryAccess(supabase, user.id);
  
  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const type = formData.get("type") as string || "SELLABLE_SIMPLE";
  
  const unitOfMeasure = formData.get("unit_of_measure") as string || "pcs";
  let unitCost = parseFloat(formData.get("unit_cost") as string) || 0;
  const sellingPrice = parseFloat(formData.get("selling_price") as string) || 0;
  const reorderThreshold = parseFloat(formData.get("reorder_threshold") as string) || 0;
  
  const recipeJson = formData.get("recipe") as string;
  let recipeData: any[] = [];
  
  if (type === 'SELLABLE_COMPOSITE' && recipeJson) {
     recipeData = JSON.parse(recipeJson);
     if (recipeData.length === 0) throw new Error("Composite items must have at least one ingredient.");
     unitCost = recipeData.reduce((sum, ing) => sum + (Number(ing.quantity_required) * Number(ing.unit_cost)), 0);
  }

  const { data: newItem, error: itemError } = await supabase.from("items").insert({
    business_id: businessId,
    name,
    sku,
    type,
    unit_of_measure: unitOfMeasure,
    unit_cost: unitCost,
    selling_price: sellingPrice,
    reorder_threshold: reorderThreshold
  }).select("id").single();

  if (itemError) throw new Error(itemError.message);

  if (type === 'SELLABLE_COMPOSITE' && recipeData.length > 0) {
    const formattedRecipe = recipeData.map(ing => ({
       business_id: businessId,
       composite_item_id: newItem.id,
       raw_material_item_id: ing.raw_material_item_id,
       quantity_required: parseFloat(ing.quantity_required)
    }));
    
    const { error: recipeErr } = await supabase.from("recipe_ingredients").insert(formattedRecipe);
    if (recipeErr) throw new Error(recipeErr.message);
  }

  revalidatePath("/inventory");
}

// ============================================================================
// 2. RECORD STOCK MOVEMENT (The Ledger)
// ============================================================================
export async function recordStockMovement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const businessId = await verifyInventoryAccess(supabase, user.id);

  const itemId = formData.get("item_id") as string;
  const type = formData.get("type") as string; 
  const quantity = parseFloat(formData.get("quantity") as string);
  const notes = formData.get("notes") as string;

  if (quantity <= 0) throw new Error("Quantity must be greater than zero.");

  const { error } = await supabase.from("stock_movements").insert({
    business_id: businessId,
    item_id: itemId,
    type,
    quantity,
    notes,
    created_by: user.id,
    reference_type: 'MANUAL'
  });

  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
}

// ============================================================================
// 3. UPDATE ITEM (Edit Catalog)
// ============================================================================
export async function updateItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const businessId = await verifyInventoryAccess(supabase, user.id);
  
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const unitOfMeasure = formData.get("unit_of_measure") as string;
  const unitCost = parseFloat(formData.get("unit_cost") as string) || 0;
  const sellingPrice = parseFloat(formData.get("selling_price") as string) || 0;
  const reorderThreshold = parseFloat(formData.get("reorder_threshold") as string) || 0;
  
  const { error } = await supabase.from("items").update({
    name,
    sku,
    unit_of_measure: unitOfMeasure,
    unit_cost: unitCost,
    selling_price: sellingPrice,
    reorder_threshold: reorderThreshold,
    updated_at: new Date().toISOString()
  }).eq("id", id).eq("business_id", businessId);

  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
}

// ============================================================================
// 4. ARCHIVE ITEM (Soft Delete)
// ============================================================================
export async function archiveItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const businessId = await verifyInventoryAccess(supabase, user.id);
  const id = formData.get("id") as string;

  const { error } = await supabase.from("items").update({
    is_archived: true,
    updated_at: new Date().toISOString()
  }).eq("id", id).eq("business_id", businessId);

  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
}

// ============================================================================
// 5. FETCH ITEM HISTORY (The Stock Card / Audit Trail)
// ============================================================================
export async function getItemHistory(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const businessId = await verifyInventoryAccess(supabase, user.id);

  const { data, error } = await supabase
    .from("stock_movements")
    .select(`
      id,
      type,
      quantity,
      notes,
      reference_type,
      created_at
    `)
    .eq("business_id", businessId)
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}