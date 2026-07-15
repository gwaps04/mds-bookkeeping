// src/app/(dashboard)/invoices/new/InvoiceForm.tsx
"use client";

import { useState } from "react";
import { createOfficialInvoice } from "@/features/invoices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SubmitButton from "@/components/SubmitButton";
import { Trash2, Plus } from "lucide-react";

export default function InvoiceForm({ customers, inventoryItems }: { customers: any[], inventoryItems: any[] }) {
  const [items, setItems] = useState([{ item_id: "", description: "", quantity: 1, unit_price: 0 }]);

  const addItem = () => setItems([...items, { item_id: "", description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleItemSelect = (index: number, selectedItemId: string) => {
    const selectedItem = inventoryItems.find(i => i.id === selectedItemId);
    const newItems = [...items];
    
    if (selectedItem) {
      newItems[index] = { ...newItems[index], item_id: selectedItem.id, description: selectedItem.name, unit_price: selectedItem.selling_price };
    } else {
      newItems[index] = { ...newItems[index], item_id: "" }; 
    }
    setItems(newItems);
  };

  // Enforce mathematically strict floating-point calculation for display
  const totalDue = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);

  return (
    <form action={createOfficialInvoice} className="space-y-8">
      
      {/* HEADER SECTION: Client & Date */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
        <div className="space-y-2.5">
          <Label htmlFor="client_name" className="text-xs font-bold text-neutral-600 uppercase tracking-wider">B2B Client / Customer Name</Label>
          <Input id="client_name" name="client_name" list="clients-list" placeholder="e.g. Acme Corp" className="h-11" required />
          <datalist id="clients-list">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
        </div>
        
        <div className="space-y-2.5">
          <Label htmlFor="due_date" className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Payment Due Date</Label>
          <Input id="due_date" name="due_date" type="date" className="h-11" required />
        </div>
      </div>

      {/* LINE ITEMS SECTION */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Line Items</h3>
          <Button type="button" onClick={addItem} variant="outline" size="sm" className="h-9 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition-colors">
            <Plus size={16} className="mr-1.5" /> Add Row
          </Button>
        </div>

        <input type="hidden" name="items" value={JSON.stringify(items)} />

        {/* ==============================================================================
            THE FIX: CSS GRID ARCHITECTURE 
            ============================================================================== */}
        <div className="space-y-4">
          
          {/* DESKTOP HEADER ROW - Only visible on lg (1024px) screens and above */}
          <div className="hidden lg:grid grid-cols-[1.5fr_2.5fr_5rem_8rem_3rem] gap-4 px-2 pb-3 border-b border-neutral-200">
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Catalog Item</div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Description</div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Qty</div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Price (₱)</div>
            <div></div> {/* Empty column for delete button alignment */}
          </div>

          <div className="space-y-5 lg:space-y-2">
            {items.map((item, index) => (
              <div 
                key={index} 
                className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_2.5fr_5rem_8rem_3rem] gap-4 items-start bg-neutral-50/70 lg:bg-transparent p-5 lg:p-2 rounded-xl border border-neutral-200 lg:border-transparent animate-in fade-in duration-300 transition-all hover:bg-neutral-50"
              >
                
                {/* 1. Catalog Dropdown */}
                <div className="space-y-2 col-span-1 sm:col-span-2 lg:col-span-1">
                  <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider lg:hidden">Catalog Item</Label>
                  <div className="relative">
                    <select
                      className="flex h-11 lg:h-10 w-full appearance-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 transition-colors hover:border-neutral-400"
                      value={item.item_id}
                      onChange={(e) => handleItemSelect(index, e.target.value)}
                    >
                      <option value="" className="text-neutral-400">-- Custom Service / Item --</option>
                      {inventoryItems.map(invItem => (
                        <option key={invItem.id} value={invItem.id}>{invItem.name}</option>
                      ))}
                    </select>
                    {/* Custom Dropdown Arrow for better UI styling */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* 2. Description Input */}
                <div className="space-y-2 col-span-1 sm:col-span-2 lg:col-span-1">
                  <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider lg:hidden">Description</Label>
                  <Input placeholder="Enter details..." className="h-11 lg:h-10" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} required />
                </div>

                {/* 3. Quantity */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider lg:hidden">Qty</Label>
                  <Input type="number" min="1" className="h-11 lg:h-10 text-center lg:text-left" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} required />
                </div>

                {/* 4. Unit Price */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider lg:hidden">Price (₱)</Label>
                  <Input type="number" step="0.01" min="0" className="h-11 lg:h-10 font-mono" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)} required />
                </div>

                {/* 5. Delete Action */}
                <div className="pt-2 lg:pt-0 flex justify-end lg:justify-center sm:col-span-2 lg:col-span-1">
                  <Button 
                    type="button" 
                    onClick={() => removeItem(index)} 
                    variant="ghost" 
                    className="text-neutral-400 hover:text-red-600 hover:bg-red-50 w-full lg:w-10 h-11 lg:h-10 transition-colors" 
                    disabled={items.length === 1}
                  >
                    <span className="lg:hidden mr-2 font-semibold">Remove Item</span>
                    <Trash2 size={18} />
                  </Button>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* TOTAL DUE FOOTER */}
        <div className="flex justify-end pt-8 pb-2 border-t border-neutral-200 mt-8">
          <div className="text-right">
            <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold mb-1">Total Due</p>
            <p className="text-4xl font-black text-neutral-900 tracking-tighter">
              ₱{totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <SubmitButton title="Save Invoice & Auto-Deduct Stock" loadingTitle="Processing..." className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold py-7 rounded-xl shadow-md hover:shadow-lg transition-all" />
    </form>
  );
}