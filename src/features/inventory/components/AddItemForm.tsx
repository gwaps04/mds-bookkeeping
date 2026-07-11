// src/features/inventory/components/AddItemForm.tsx
"use client";

import { useState, useRef } from "react";
import { createItem } from "@/features/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";

export default function AddItemForm({ rawMaterials }: { rawMaterials: any[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [itemType, setItemType] = useState("SELLABLE_SIMPLE");
  
  // THE FIX: Control the Unit of Measure state to handle defaults
  const [unitOfMeasure, setUnitOfMeasure] = useState("");
  
  const [recipe, setRecipe] = useState<any[]>([]);
  const [isPending, setIsPending] = useState(false);

  // Dynamic default setter based on item type
  const handleTypeChange = (val: string) => {
    setItemType(val);
    if (val === 'RAW_MATERIAL') setUnitOfMeasure("grams");
    else if (val === 'SELLABLE_COMPOSITE') setUnitOfMeasure("serving");
    else setUnitOfMeasure("pcs");
  };

  const addIngredient = () => setRecipe([...recipe, { raw_material_item_id: "", quantity_required: 1, unit_cost: 0 }]);
  const removeIngredient = (index: number) => setRecipe(recipe.filter((_, i) => i !== index));

  const updateIngredient = (index: number, field: string, value: string) => {
    const newRecipe = [...recipe];
    if (field === "raw_material_item_id") {
      const selectedRaw = rawMaterials.find(rm => rm.id === value);
      newRecipe[index] = { ...newRecipe[index], raw_material_item_id: value, unit_cost: selectedRaw?.unit_cost || 0 };
    } else {
      newRecipe[index] = { ...newRecipe[index], [field]: value };
    }
    setRecipe(newRecipe);
  };

  const calculatedCOGS = recipe.reduce((sum, item) => sum + (Number(item.quantity_required) * Number(item.unit_cost)), 0);

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    try {
      await createItem(formData);
      formRef.current?.reset();
      setRecipe([]);
      setItemType("SELLABLE_SIMPLE");
      setUnitOfMeasure(""); // Reset the select dropdown
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Item Classification</Label>
        <Select name="type" value={itemType} onValueChange={handleTypeChange} required>
          <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SELLABLE_SIMPLE">Sellable Product (Auto-deducted on Invoice)</SelectItem>
            <SelectItem value="SUPPLY">Internal Supply (Manual deduction only)</SelectItem>
            <SelectItem value="RAW_MATERIAL">Raw Material (Used as an ingredient)</SelectItem>
            <SelectItem value="SELLABLE_COMPOSITE">Composite / Menu Item (Requires Recipe)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Item Name</Label>
        <Input name="name" required placeholder={itemType === 'SELLABLE_COMPOSITE' ? "e.g. Vanilla Latte" : "e.g. Coffee Beans"} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>SKU (Optional)</Label>
          <Input name="sku" placeholder="Barcode / ID" />
        </div>
        <div className="space-y-1.5">
          <Label>Unit of Measure</Label>
          {/* THE FIX: Standardized Dropdown for UOM */}
          <Select name="unit_of_measure" value={unitOfMeasure} onValueChange={setUnitOfMeasure} required>
            <SelectTrigger><SelectValue placeholder="Select unit..." /></SelectTrigger>
            <SelectContent className="max-h-[250px]">
              <SelectGroup>
                <SelectLabel>Physical Count</SelectLabel>
                <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                <SelectItem value="box">Box (box)</SelectItem>
                <SelectItem value="pack">Pack (pack)</SelectItem>
                <SelectItem value="set">Set (set)</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Weight & Volume</SelectLabel>
                <SelectItem value="grams">Grams (g)</SelectItem>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
                <SelectItem value="ml">Milliliters (ml)</SelectItem>
                <SelectItem value="liter">Liters (L)</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Length</SelectLabel>
                <SelectItem value="cm">Centimeters (cm)</SelectItem>
                <SelectItem value="meter">Meters (m)</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Services</SelectLabel>
                <SelectItem value="hour">Hours (hr)</SelectItem>
                <SelectItem value="session">Session</SelectItem>
                <SelectItem value="serving">Serving</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {itemType === 'SELLABLE_COMPOSITE' && (
        <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-orange-900 font-bold">Recipe Builder</Label>
            <Button type="button" onClick={addIngredient} variant="outline" size="sm" className="h-7 text-xs bg-white text-orange-600 border-orange-200">+ Add Ingredient</Button>
          </div>
          
          <input type="hidden" name="recipe" value={JSON.stringify(recipe)} />
          
          <div className="space-y-3">
            {recipe.map((ing, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <select className="flex h-9 w-full rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm shadow-sm"
                    value={ing.raw_material_item_id} onChange={(e) => updateIngredient(index, 'raw_material_item_id', e.target.value)} required>
                    <option value="">Select Raw Material...</option>
                    {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name} (per {rm.unit_of_measure})</option>)}
                  </select>
                </div>
                <div className="w-20">
                  <Input type="number" step="0.01" placeholder="Qty" value={ing.quantity_required} onChange={(e) => updateIngredient(index, 'quantity_required', e.target.value)} required className="h-9" />
                </div>
                <Button type="button" onClick={() => removeIngredient(index)} variant="ghost" className="h-9 px-2 text-red-500">X</Button>
              </div>
            ))}
            {recipe.length === 0 && <p className="text-xs text-orange-600/70 italic">Add ingredients to build this item.</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{itemType === 'SELLABLE_COMPOSITE' ? 'Calculated COGS' : 'Unit Cost'}</Label>
          {itemType === 'SELLABLE_COMPOSITE' ? (
            <div className="flex h-10 w-full items-center rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500 font-bold">
              {calculatedCOGS.toFixed(2)}
              <input type="hidden" name="unit_cost" value={calculatedCOGS} />
            </div>
          ) : (
            <Input name="unit_cost" type="number" step="0.01" required placeholder="0.00" />
          )}
        </div>
        
        <div className="space-y-1.5">
          <Label>Selling Price</Label>
          <Input name="selling_price" type="number" step="0.01" required placeholder="0.00" disabled={itemType === 'SUPPLY' || itemType === 'RAW_MATERIAL'} defaultValue={itemType === 'SUPPLY' || itemType === 'RAW_MATERIAL' ? "0" : ""} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Reorder Threshold Alert</Label>
        <Input name="reorder_threshold" type="number" defaultValue="5" required />
      </div>

      <Button type="submit" disabled={isPending} className="w-full bg-neutral-900 hover:bg-neutral-800 text-white">
        {isPending ? "Saving..." : "Save Item to Catalog"}
      </Button>
    </form>
  );
}