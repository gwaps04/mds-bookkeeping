// src/features/inventory/components/LogStockMovementForm.tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { recordStockMovement } from "@/features/inventory/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubmitButton from "@/components/SubmitButton";

export default function LogStockMovementForm({ items }: { items: any[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  
  const [movementType, setMovementType] = useState("STOCK_IN");
  const [selectedItem, setSelectedItem] = useState("");
  const [currentUnitCost, setCurrentUnitCost] = useState<number | string>("");

  useEffect(() => {
    if (selectedItem) {
      const item = items.find(i => i.id === selectedItem);
      // THE FIX: Force exactly 2 decimal places to satisfy HTML5 input step validations
      if (item) setCurrentUnitCost(Number(item.unit_cost || 0).toFixed(2));
    } else {
      setCurrentUnitCost("");
    }
  }, [selectedItem, items]);

  const handleSubmit = async (formData: FormData) => {
    try {
      await recordStockMovement(formData);
      formRef.current?.reset();
      setMovementType("STOCK_IN");
      setSelectedItem("");
      setCurrentUnitCost("");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Movement Action</Label>
        <Select name="type" value={movementType} onValueChange={setMovementType} required>
          <SelectTrigger className="border-blue-200 focus:ring-blue-500"><SelectValue placeholder="Select action..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="STOCK_IN">Receive Delivery (+ Stock In)</SelectItem>
            <SelectItem value="STOCK_OUT">Manual Use / Damage (- Stock Out)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Select Item</Label>
        <Select name="item_id" value={selectedItem} onValueChange={setSelectedItem} required>
          <SelectTrigger><SelectValue placeholder="Choose item..." /></SelectTrigger>
          <SelectContent>
            {items?.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Quantity</Label>
          <Input name="quantity" type="number" step="0.01" min="0.01" required placeholder="0" className="focus-visible:ring-blue-600 font-bold text-blue-700 bg-blue-50" />
        </div>

        {movementType === 'STOCK_IN' && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
            <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Purchase Price</Label>
            <Input 
              name="unit_cost" 
              type="number" 
              step="0.01" 
              min="0" 
              required 
              value={currentUnitCost}
              onChange={(e) => setCurrentUnitCost(e.target.value)}
              placeholder="0.00" 
              className="focus-visible:ring-emerald-600 font-mono" 
              title="The price paid per unit for this specific delivery."
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5 pb-2">
        <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Movement Notes</Label>
        <Input name="notes" placeholder="e.g. Used for cleaning, Supplier Inv #123" className="focus-visible:ring-blue-600" />
      </div>

      <div className="pt-2 border-t border-neutral-100">
        <SubmitButton 
          title="Log to Ledger" 
          loadingTitle="Logging..." 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm h-11 sm:h-10 transition-all" 
        />
      </div>
    </form>
  );
}