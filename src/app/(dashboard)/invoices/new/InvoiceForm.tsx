// src/app/(dashboard)/invoices/new/InvoiceForm.tsx
"use client";

import { useState } from "react";
import { createOfficialInvoice } from "@/features/invoices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SubmitButton from "@/components/SubmitButton";

export default function InvoiceForm({ customers }: { customers: any[] }) {
  // State to manage dynamic line items
  const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Live calculation
  const totalDue = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);

  return (
    <form action={createOfficialInvoice} className="space-y-8">
      
      {/* MASTER INVOICE DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="client_name">B2B Client / Customer Name</Label>
          {/* Datalist provides an auto-complete dropdown of past clients! */}
          <Input id="client_name" name="client_name" list="clients-list" placeholder="e.g. Acme Corp" required />
          <datalist id="clients-list">
            {customers.map(c => <option key={c.id} value={c.name} />)}
          </datalist>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="due_date">Payment Due Date</Label>
          <Input 
  id="due_date" 
  name="due_date" 
  type="date" 
  defaultValue="" 
  required 
/>
        </div>
      </div>

      {/* DYNAMIC LINE ITEMS */}
      <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-neutral-900">Line Items</h3>
          <Button type="button" onClick={addItem} variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
            + Add Row
          </Button>
        </div>

        {/* This hidden input packages all our complex rows into a single string for the Server Action! */}
        <input type="hidden" name="items" value={JSON.stringify(items)} />

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 items-start animate-in fade-in duration-300">
              <div className="flex-1 space-y-1">
                {index === 0 && <Label className="text-xs text-neutral-500 uppercase tracking-wider">Description</Label>}
                <Input 
                  placeholder="Service / Product name" 
                  value={item.description} 
                  onChange={(e) => updateItem(index, 'description', e.target.value)} 
                  required 
                />
              </div>
              <div className="w-24 space-y-1">
                {index === 0 && <Label className="text-xs text-neutral-500 uppercase tracking-wider">Qty</Label>}
                <Input 
                  type="number" min="1" 
                  value={item.quantity} 
                  onChange={(e) => updateItem(index, 'quantity', e.target.value)} 
                  required 
                />
              </div>
              <div className="w-32 space-y-1">
                {index === 0 && <Label className="text-xs text-neutral-500 uppercase tracking-wider">Price (₱)</Label>}
                <Input 
                  type="number" step="0.01" min="0" 
                  value={item.unit_price} 
                  onChange={(e) => updateItem(index, 'unit_price', e.target.value)} 
                  required 
                />
              </div>
              <div className="pt-1">
                {index === 0 && <div className="h-[20px]"></div>}
                <Button type="button" onClick={() => removeItem(index)} variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" disabled={items.length === 1}>
                  X
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* LIVE TOTAL ALGORITHM */}
        <div className="flex justify-end pt-6 border-t border-neutral-100 mt-6">
          <div className="text-right">
            <p className="text-sm text-neutral-500 uppercase tracking-wider font-bold">Total Due</p>
            <p className="text-3xl font-black text-neutral-900 mt-1">
              ₱{totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <SubmitButton 
  title="Save Invoice & Update PDF" 
  loadingTitle="Saving & Generating PDF..." 
  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6" 
/>
    </form>
  );
}