"use client";

import { useRef, useState } from "react";
import { recordStockMovement } from "@/features/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LogStockMovementForm({ items }: { items: any[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);
  
  // We need to control the select states manually to clear them on success
  const [movementType, setMovementType] = useState("STOCK_IN");
  const [selectedItem, setSelectedItem] = useState("");

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    try {
      await recordStockMovement(formData);
      // Instantly reset the form!
      formRef.current?.reset();
      setMovementType("STOCK_IN");
      setSelectedItem("");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Movement Action</Label>
        <Select name="type" value={movementType} onValueChange={setMovementType} required>
          <SelectTrigger className="border-blue-200 focus:ring-blue-500"><SelectValue placeholder="Select action..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="STOCK_IN">Receive Delivery (+ Stock In)</SelectItem>
            <SelectItem value="STOCK_OUT">Manual Use / Damage (- Stock Out)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Select Item</Label>
        <Select name="item_id" value={selectedItem} onValueChange={setSelectedItem} required>
          <SelectTrigger><SelectValue placeholder="Choose item..." /></SelectTrigger>
          <SelectContent>
            {items?.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Quantity</Label>
        <Input name="quantity" type="number" step="0.01" min="0.01" required placeholder="0" />
      </div>

      <div className="space-y-1.5">
        <Label>Movement Notes</Label>
        <Input name="notes" placeholder="e.g. Used for cleaning, Supplier Inv #123" />
      </div>

      <Button type="submit" disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        {isPending ? "Logging..." : "Log to Ledger"}
      </Button>
    </form>
  );
}