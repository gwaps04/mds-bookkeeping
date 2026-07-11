// src/features/inventory/components/ItemRowActions.tsx
"use client";

import { useState } from "react";
import { updateItem, archiveItem } from "@/features/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import SubmitButton from "@/components/SubmitButton";
import { Edit2, Trash2, X } from "lucide-react";

export default function ItemRowActions({ item }: { item: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [unitOfMeasure, setUnitOfMeasure] = useState(item.unit_of_measure || "pcs");

  return (
    <div className="flex items-center justify-end gap-2">
      
      {/* EDIT BUTTON */}
      <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="h-8 w-8 p-0 text-blue-600 border-blue-200 hover:bg-blue-50">
        <Edit2 size={14} />
      </Button>

      {/* ARCHIVE (SOFT DELETE) FORM */}
      <form action={archiveItem} onSubmit={(e) => { if(!confirm("Are you sure you want to archive this item? It will be hidden from the catalog.")) e.preventDefault(); }}>
        <input type="hidden" name="id" value={item.id} />
        <Button type="submit" variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50">
          <Trash2 size={14} />
        </Button>
      </form>

      {/* PURE TAILWIND EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-neutral-100 bg-neutral-50/50">
              <h3 className="font-bold text-lg text-neutral-900">Edit Catalog Item</h3>
              <button type="button" onClick={() => setIsEditOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors"><X size={20}/></button>
            </div>
            
            <form action={async (fd) => { await updateItem(fd); setIsEditOpen(false); }} className="p-5 space-y-4">
              <input type="hidden" name="id" value={item.id} />
              
              <div className="space-y-1.5">
                <Label>Item Name</Label>
                <Input name="name" defaultValue={item.name} required />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>SKU</Label>
                  <Input name="sku" defaultValue={item.sku} />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit of Measure</Label>
                  {/* THE FIX: Standardized Dropdown mirrored from AddItemForm */}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Unit Cost</Label>
                  <Input name="unit_cost" type="number" step="0.01" defaultValue={item.unit_cost} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Selling Price</Label>
                  <Input name="selling_price" type="number" step="0.01" defaultValue={item.selling_price} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Reorder Threshold</Label>
                <Input name="reorder_threshold" type="number" defaultValue={item.reorder_threshold} required />
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <SubmitButton title="Save Changes" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}