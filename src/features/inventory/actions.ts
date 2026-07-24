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

  if (!bizHasInventory && !isSuperAdmin) {
    throw new Error("Security Violation: This business does not have an active Inventory subscription.");
  }

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
// 2. RECORD STOCK MOVEMENT (The Ledger) WITH W.A.C. COSTING ENGINE
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
  
  const inputtedCost = formData.get("unit_cost") ? parseFloat(formData.get("unit_cost") as string) : null;

  if (quantity <= 0) throw new Error("Quantity must be greater than zero.");

  const { data: liveItem } = await supabase.from("items").select("unit_cost, quantity_on_hand").eq("id", itemId).single();
  
  const currentCost = Number(liveItem?.unit_cost || 0);
  const currentQty = Math.max(0, Number(liveItem?.quantity_on_hand || 0));

  let snapshotCost = currentCost;

  if (type === 'STOCK_IN' && inputtedCost !== null && inputtedCost >= 0) {
    snapshotCost = inputtedCost;

    if (inputtedCost !== currentCost) {
      const oldTotalValue = currentQty * currentCost;
      const newBatchValue = quantity * inputtedCost;
      const newTotalQty = currentQty + quantity;

      const newWAC = newTotalQty > 0 ? (oldTotalValue + newBatchValue) / newTotalQty : inputtedCost;

      await supabase.from("items").update({ unit_cost: newWAC }).eq("id", itemId);
    }
  }

  const { error } = await supabase.from("stock_movements").insert({
    business_id: businessId,
    item_id: itemId,
    type,
    quantity,
    unit_cost: snapshotCost, 
    notes,
    created_by: user.id,
    reference_type: 'MANUAL'
  });

  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

// ============================================================================
// 3. UPDATE ITEM (WITH RECIPE EDITS) & LOG PRICE CHANGES
// ============================================================================
export async function updateItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const businessId = await verifyInventoryAccess(supabase, user.id);
  
  const id = formData.get("id") as string;
  const type = formData.get("type") as string; // We need the type to know if we are editing a recipe
  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const unitOfMeasure = formData.get("unit_of_measure") as string;
  let newUnitCost = parseFloat(formData.get("unit_cost") as string) || 0;
  const newSellingPrice = parseFloat(formData.get("selling_price") as string) || 0;
  const reorderThreshold = parseFloat(formData.get("reorder_threshold") as string) || 0;
  
  // THE FIX: Intercept Recipe Changes
  const recipeJson = formData.get("recipe") as string;
  let recipeData: any[] = [];
  
  if (type === 'SELLABLE_COMPOSITE' && recipeJson) {
     recipeData = JSON.parse(recipeJson);
     if (recipeData.length === 0) throw new Error("Composite items must have at least one ingredient.");
     // Recalculate the cost strictly on the backend to prevent frontend manipulation
     newUnitCost = recipeData.reduce((sum, ing) => sum + (Number(ing.quantity_required) * Number(ing.unit_cost)), 0);
  }

  const { data: oldItem } = await supabase.from("items").select("unit_cost, selling_price, name").eq("id", id).single();

  const { error } = await supabase.from("items").update({
    name,
    sku,
    unit_of_measure: unitOfMeasure,
    unit_cost: newUnitCost,
    selling_price: newSellingPrice,
    reorder_threshold: reorderThreshold,
    updated_at: new Date().toISOString()
  }).eq("id", id).eq("business_id", businessId);

  if (error) throw new Error(error.message);

  // THE FIX: Rewrite the Recipe Ingredients safely
  if (type === 'SELLABLE_COMPOSITE' && recipeData.length > 0) {
    // 1. Delete the old recipe configuration
    await supabase.from("recipe_ingredients").delete().eq("composite_item_id", id).eq("business_id", businessId);
    
    // 2. Insert the new updated recipe
    const formattedRecipe = recipeData.map(ing => ({
       business_id: businessId,
       composite_item_id: id,
       raw_material_item_id: ing.raw_material_item_id,
       quantity_required: parseFloat(ing.quantity_required)
    }));
    const { error: recipeErr } = await supabase.from("recipe_ingredients").insert(formattedRecipe);
    if (recipeErr) throw new Error(recipeErr.message);
  }

  if (oldItem && (oldItem.unit_cost !== newUnitCost || oldItem.selling_price !== newSellingPrice)) {
    await supabase.from("audit_logs").insert({
      business_id: businessId,
      actor_id: user.id,
      action: "PRICE_CHANGE",
      table_name: "items",
      record_id: id,
      details: {
        item_name: oldItem.name,
        old_unit_cost: oldItem.unit_cost,
        new_unit_cost: newUnitCost,
        old_selling_price: oldItem.selling_price,
        new_selling_price: newSellingPrice
      }
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
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

// ============================================================================
// 6. REVERSE STOCK MOVEMENT (Contra Entry)
// ============================================================================
export async function reverseStockMovement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const businessId = await verifyInventoryAccess(supabase, user.id);
  const movementId = formData.get("movement_id") as string;

  const { data: original, error: fetchErr } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("id", movementId)
    .eq("business_id", businessId)
    .single();

  if (fetchErr || !original) throw new Error("Original movement not found.");

  let contraType = 'STOCK_IN'; 
  if (original.type === 'STOCK_IN') contraType = 'STOCK_OUT';
  else if (original.type === 'STOCK_OUT' || original.type === 'SALE') contraType = 'STOCK_IN';

  const { error: insertErr } = await supabase.from("stock_movements").insert({
    business_id: businessId,
    item_id: original.item_id,
    type: contraType,
    quantity: original.quantity, 
    unit_cost: original.unit_cost, 
    notes: `SYSTEM REVERSAL: Correction for movement on ${new Date(original.created_at).toLocaleString()}`,
    created_by: user.id,
    reference_type: 'REVERSAL',
    reference_id: original.id
  });

  if (insertErr) throw new Error(insertErr.message);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

// ============================================================================
// 7. GET RECIPE INGREDIENTS (For the Edit Modal)
// ============================================================================
export async function getRecipe(compositeItemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const businessId = await verifyInventoryAccess(supabase, user.id);

  const { data, error } = await supabase
    .from("recipe_ingredients")
    .select("*")
    .eq("business_id", businessId)
    .eq("composite_item_id", compositeItemId);

  if (error) throw new Error(error.message);
  return data;
}