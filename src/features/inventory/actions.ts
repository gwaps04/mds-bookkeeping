// src/features/inventory/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ============================================================================
// 1. CREATE NEW ITEM (Catalog & Recipes)
// ============================================================================
export async function createItem(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  
  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const type = formData.get("type") as string || "SELLABLE_SIMPLE";
  
  // Declared in camelCase
  const unitOfMeasure = formData.get("unit_of_measure") as string || "pcs";
  let unitCost = parseFloat(formData.get("unit_cost") as string) || 0;
  const sellingPrice = parseFloat(formData.get("selling_price") as string) || 0;
  const reorderThreshold = parseFloat(formData.get("reorder_threshold") as string) || 0;
  
  // THE NEW RECIPE ENGINE LOGIC
  const recipeJson = formData.get("recipe") as string;
  let recipeData: any[] = [];
  
  if (type === 'SELLABLE_COMPOSITE' && recipeJson) {
     recipeData = JSON.parse(recipeJson);
     if (recipeData.length === 0) throw new Error("Composite items must have at least one ingredient.");
     
     // Auto-calculate COGS based on the raw material costs!
     unitCost = recipeData.reduce((sum, ing) => sum + (Number(ing.quantity_required) * Number(ing.unit_cost)), 0);
  }

  // 1. Insert the Master Item (Notice the .select("id").single() to get the ID back)
  const { data: newItem, error: itemError } = await supabase.from("items").insert({
    business_id: profile?.business_id,
    name,
    sku,
    type,
    unit_of_measure: unitOfMeasure,
    unit_cost: unitCost,
    selling_price: sellingPrice,
    reorder_threshold: reorderThreshold
  }).select("id").single();

  if (itemError) throw new Error(itemError.message);

  // 2. Insert the Recipe Ingredients to connect them to the Master Item
  if (type === 'SELLABLE_COMPOSITE' && recipeData.length > 0) {
    const formattedRecipe = recipeData.map(ing => ({
       business_id: profile?.business_id,
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

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();

  const itemId = formData.get("item_id") as string;
  const type = formData.get("type") as string; // 'STOCK_IN' or 'STOCK_OUT'
  const quantity = parseFloat(formData.get("quantity") as string);
  const notes = formData.get("notes") as string;

  if (quantity <= 0) throw new Error("Quantity must be greater than zero.");

  // By inserting into stock_movements, our PostgreSQL Trigger will automatically 
  // calculate and update the quantity_on_hand in the items table!
  const { error } = await supabase.from("stock_movements").insert({
    business_id: profile?.business_id,
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

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  
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
  }).eq("id", id).eq("business_id", profile?.business_id);

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

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const id = formData.get("id") as string;

  // We DO NOT delete the item. We archive it to preserve the stock_movements ledger!
  const { error } = await supabase.from("items").update({
    is_archived: true,
    updated_at: new Date().toISOString()
  }).eq("id", id).eq("business_id", profile?.business_id);

  if (error) throw new Error(error.message);
  revalidatePath("/inventory");
}