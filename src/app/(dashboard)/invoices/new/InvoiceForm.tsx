// src/app/(dashboard)/invoices/new/InvoiceForm.tsx
"use client";

import { useState } from "react";
import { createOfficialInvoice } from "@/features/invoices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SubmitButton from "@/components/SubmitButton";
import { Trash2, Plus, Lock, AlertTriangle, AlertCircle } from "lucide-react";

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
      newItems[index] = { ...newItems[index], item_id: selectedItem.id, description: selectedItem.name, unit_price: selectedItem.selling_price || 0 };
    } else {
      newItems[index] = { ...newItems[index], item_id: "", description: "", unit_price: 0 }; 
    }
    setItems(newItems);
  };

  // ============================================================================
  // THE CLIENT-SIDE ACTION WRAPPER (GUARANTEED INTERCEPTION)
  // ============================================================================
  const clientAction = (formData: FormData) => {
    let hasEmptyStock = false;
    let hasLowStock = false;

    items.forEach(cartItem => {
      const dbItem = inventoryItems.find(i => i.id === cartItem.item_id);
      if (!dbItem || dbItem.type === 'SELLABLE_COMPOSITE') return;

      // Safe Number parsing to prevent NaN breaks
      const currentStock = Number(dbItem.quantity_on_hand || 0);
      const orderQty = Number(cartItem.quantity || 0);
      const threshold = Number(dbItem.reorder_threshold || 0);
      
      const projectedStock = currentStock - orderQty;
      
      if (projectedStock < 0) hasEmptyStock = true;
      else if (projectedStock <= threshold) hasLowStock = true;
    });

    if (hasEmptyStock) {
      const confirm = window.confirm("🚨 CRITICAL WARNING: You are attempting to invoice items that are OUT OF STOCK.\n\nProceeding will push your inventory into the negative. Are you sure you want to process this order and reconcile the physical stock later?");
      if (!confirm) return; 
    } 
    else if (hasLowStock) {
      const confirm = window.confirm("⚠️ INVENTORY ALERT: Processing this invoice will drop some items into critical low stock territory. Please remind the team to restock immediately.\n\nDo you wish to proceed?");
      if (!confirm) return; 
    }

    createOfficialInvoice(formData);
  };

  const totalDue = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);

  return (
    <form action={clientAction} className="space-y-8 w-full min-w-0">
      
      {/* HEADER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-neutral-200 shadow-sm w-full min-w-0">
        <div className="space-y-2.5 w-full min-w-0">
          <Label htmlFor="client_name" className="text-xs font-bold text-neutral-600 uppercase tracking-wider">B2B Client / Customer Name</Label>
          <Input id="client_name" name="client_name" list="clients-list" placeholder="e.g. Acme Corp" className="h-11 w-full" required />
          <datalist id="clients-list">{customers?.map(c => <option key={c.id} value={c.name} />)}</datalist>
        </div>
        
        <div className="space-y-2.5 w-full min-w-0">
          <Label htmlFor="due_date" className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Payment Due Date</Label>
          <Input id="due_date" name="due_date" type="date" className="h-11 w-full" required />
        </div>
      </div>

      {/* LINE ITEMS SECTION */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-neutral-200 shadow-sm space-y-4 w-full min-w-0 overflow-x-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-neutral-900 tracking-tight">Line Items</h3>
          <Button type="button" onClick={addItem} variant="outline" size="sm" className="h-9 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition-colors shrink-0">
            <Plus size={16} className="mr-1.5" /> Add Row
          </Button>
        </div>

        <input type="hidden" name="items" value={JSON.stringify(items)} />

        <div className="space-y-4 w-full min-w-0">
          
          <div className="hidden lg:grid grid-cols-[1.5fr_2.5fr_5rem_8rem_3rem] gap-4 px-2 pb-3 border-b border-neutral-200">
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Catalog Item</div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Description</div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Qty</div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Price (₱)</div>
            <div></div>
          </div>

          <div className="space-y-5 lg:space-y-2 w-full min-w-0">
            {items.map((item, index) => {
              const isLocked = item.item_id !== "";
              
              const dbItem = inventoryItems?.find(i => i.id === item.item_id);
              const isComposite = dbItem?.type === 'SELLABLE_COMPOSITE';
              let stockStatus = 'HEALTHY';
              let projectedStock = 0;

              if (dbItem && !isComposite) {
                const currentStock = Number(dbItem.quantity_on_hand || 0);
                const orderQty = Number(item.quantity || 0);
                projectedStock = currentStock - orderQty;
                
                if (projectedStock < 0) stockStatus = 'EMPTY';
                else if (projectedStock <= Number(dbItem.reorder_threshold || 0)) stockStatus = 'LOW';
              }

              return (
                <div 
                  key={index} 
                  className={`relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_2.5fr_5rem_8rem_3rem] gap-4 items-start p-5 lg:p-2 rounded-xl border transition-all animate-in fade-in duration-300 w-full min-w-0
                    ${stockStatus === 'EMPTY' ? 'bg-red-50/50 border-red-200 lg:border-red-200' : 
                      stockStatus === 'LOW' ? 'bg-amber-50/50 border-amber-200 lg:border-amber-200' : 
                      'bg-neutral-50/70 lg:bg-transparent border-neutral-200 lg:border-transparent hover:bg-neutral-50'}`}
                >
                  
                  {/* 1. Catalog Dropdown */}
                  <div className="space-y-2 col-span-1 sm:col-span-2 lg:col-span-1 w-full min-w-0">
                    <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider lg:hidden">Catalog Item</Label>
                    <div className="relative">
                      <select
                        className="flex h-11 lg:h-10 w-full appearance-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 transition-colors hover:border-neutral-400 truncate pr-8"
                        value={item.item_id}
                        onChange={(e) => handleItemSelect(index, e.target.value)}
                      >
                        <option value="" className="text-neutral-400">-- Custom Service / Item --</option>
                        {inventoryItems?.map(invItem => {
                           const isMenu = invItem.type === 'SELLABLE_COMPOSITE';
                           // Better formatting to handle zero or composite items
                           const stockLabel = isMenu ? '(Made-to-order)' : `(Stock: ${Number(invItem.quantity_on_hand || 0)})`;
                           return (
                             <option key={invItem.id} value={invItem.id}>{invItem.name} {stockLabel}</option>
                           );
                        })}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  {/* 2. Description Input & RESPONSIVE INLINE WARNINGS */}
                  <div className="space-y-2 col-span-1 sm:col-span-2 lg:col-span-1 relative w-full min-w-0 flex flex-col justify-start">
                    <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider lg:hidden">Description</Label>
                    <div className="relative w-full">
                      <Input 
                        placeholder="Enter details..." 
                        className={`h-11 lg:h-10 w-full transition-colors ${isLocked ? "bg-neutral-100 text-neutral-500 cursor-not-allowed border-transparent focus-visible:ring-0 pr-10" : ""}`}
                        value={item.description} 
                        onChange={(e) => updateItem(index, 'description', e.target.value)} 
                        readOnly={isLocked}
                        required 
                      />
                      {isLocked && <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />}
                    </div>
                    
                    {/* STANDARD DOCUMENT FLOW FOR FLUID LAYOUT */}
                    {stockStatus === 'EMPTY' && (
                      <div className="text-[10px] sm:text-xs font-bold text-red-600 flex items-start gap-1.5 mt-2 leading-tight animate-in slide-in-from-top-1 fade-in">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>Out of stock! Projecting {projectedStock}</span>
                      </div>
                    )}
                    {stockStatus === 'LOW' && (
                      <div className="text-[10px] sm:text-xs font-bold text-amber-600 flex items-start gap-1.5 mt-2 leading-tight animate-in slide-in-from-top-1 fade-in">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>Restock soon (Only {projectedStock} will remain)</span>
                      </div>
                    )}
                  </div>

                  {/* 3. Quantity */}
                  <div className="space-y-2 w-full min-w-0">
                    <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider lg:hidden">Qty</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      className={`h-11 lg:h-10 w-full text-center lg:text-left ${stockStatus === 'EMPTY' ? 'bg-red-50 border-red-300' : 'bg-white'}`} 
                      value={item.quantity} 
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)} 
                      required 
                    />
                  </div>

                  {/* 4. Unit Price */}
                  <div className="space-y-2 relative w-full min-w-0">
                    <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider lg:hidden">Price (₱)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      className={`h-11 lg:h-10 w-full font-mono transition-colors ${isLocked ? "bg-neutral-100 text-neutral-500 cursor-not-allowed border-transparent focus-visible:ring-0" : ""}`}
                      value={item.unit_price} 
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)} 
                      readOnly={isLocked}
                      required 
                    />
                  </div>

                  {/* 5. Delete Action */}
                  <div className="pt-2 lg:pt-0 flex justify-end lg:justify-center sm:col-span-2 lg:col-span-1 pb-4 lg:pb-0 w-full shrink-0">
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
              );
            })}
          </div>
        </div>

        {/* TOTAL DUE FOOTER */}
        <div className="flex justify-end pt-8 pb-2 border-t border-neutral-200 mt-8 w-full">
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