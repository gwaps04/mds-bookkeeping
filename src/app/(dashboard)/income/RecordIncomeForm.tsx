// src/app/(dashboard)/income/RecordIncomeForm.tsx
"use client";

import { useRef, useState } from "react";
import { createIncome } from "@/features/income/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubmitButton from "@/components/SubmitButton";
import { Lock } from "lucide-react";

export default function RecordIncomeForm({
  revenueCategories,
  bankAccounts,
  isLocked
}: {
  revenueCategories: any[];
  bankAccounts: any[];
  isLocked: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  
  // THE FIX: We must manually control the Radix UI Select components
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");

  const handleSubmit = async (formData: FormData) => {
    try {
      await createIncome(formData);
      
      // 1. Instantly clear native HTML inputs (text, number, date)
      formRef.current?.reset();
      
      // 2. Instantly clear Radix UI React state!
      setCategoryId("");
      setAccountId("");
    } catch (error: any) {
      alert("Error recording income: " + error.message);
    }
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4 w-full">
      
      <div className="space-y-1.5 w-full">
        <Label htmlFor="customer_name" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Customer / Entity</Label>
        <Input id="customer_name" name="customer_name" placeholder="e.g. Walk-in, Business Owner" required disabled={isLocked} className="w-full focus-visible:ring-green-600 font-medium" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
        <div className="space-y-1.5 w-full">
          <Label htmlFor="amount" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Amount</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required disabled={isLocked} className="w-full focus-visible:ring-green-600 font-bold" />
        </div>
        <div className="space-y-1.5 w-full">
          <Label htmlFor="date" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required disabled={isLocked} className="w-full focus-visible:ring-green-600" />
        </div>
      </div>

      <div className="space-y-1.5 w-full">
        <Label htmlFor="category_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Category</Label>
        <Select name="category_id" value={categoryId} onValueChange={setCategoryId} required disabled={isLocked}>
          <SelectTrigger className="w-full focus:ring-green-600">
            <SelectValue placeholder="Select category..." />
          </SelectTrigger>
          <SelectContent className="max-h-[250px] w-full">
            {revenueCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 w-full">
        <Label htmlFor="account_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Deposit To (Bank)</Label>
        <Select name="account_id" value={accountId} onValueChange={setAccountId} required disabled={isLocked}>
          <SelectTrigger className="w-full focus:ring-green-600">
            <SelectValue placeholder="Select account..." />
          </SelectTrigger>
          <SelectContent className="max-h-[250px] w-full">
            {bankAccounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5 w-full">
        <Label htmlFor="reference_number" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Ref No. (Optional)</Label>
        <Input id="reference_number" name="reference_number" placeholder="e.g. GCash Ref, Check No." disabled={isLocked} className="w-full focus-visible:ring-green-600 font-mono" />
      </div>

      <div className="space-y-1.5 w-full">
        <Label htmlFor="description" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Notes (Optional)</Label>
        <Textarea 
          id="description" 
          name="description" 
          placeholder="Provide details about this transaction..." 
          className="w-full resize-none h-16 focus-visible:ring-green-600"
          disabled={isLocked}
        />
      </div>

      <div className="pt-2 w-full border-t border-neutral-100 mt-2">
        {isLocked ? (
          <Button disabled type="button" className="w-full bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-none font-medium flex items-center justify-center gap-2 h-11 md:h-10 mt-4">
            <Lock size={16} /> Creation Locked
          </Button>
        ) : (
          <div className="mt-4">
            <SubmitButton 
              title="Record Income" 
              loadingTitle="Saving Record..." 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold transition-all h-11 md:h-10 shadow-sm" 
            />
          </div>
        )}
      </div>
    </form>
  );
}