// src/app/(dashboard)/accounts/CreateAccountForm.tsx
"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubmitButton from "@/components/SubmitButton";
import { createAccount } from "@/features/accounts/actions";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function CreateAccountForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  
  // THE FIX: We use a key to force React to completely rebuild the Radix Select component on success
  const [resetKey, setResetKey] = useState(Date.now().toString());

  const clientAction = async (formData: FormData) => {
    setStatus({ type: null, message: '' }); 
    
    try {
      await createAccount(formData);

      setStatus({ type: 'success', message: 'Account successfully created!' });
      
      // 1. Wipe the native form fields (Inputs)
      formRef.current?.reset();
      
      // 2. Destroy and rebuild the custom React components (Select)
      setResetKey(Date.now().toString());

      setTimeout(() => {
        setStatus({ type: null, message: '' });
      }, 4000);

    } catch (error: any) {
      setStatus({ type: 'error', message: error.message || 'An unexpected error occurred while saving.' });
    }
  };

  return (
    <form ref={formRef} action={clientAction} className="space-y-4">
      
      {status.type === 'success' && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-2 text-emerald-700 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={16} className="shrink-0" />
          <span className="font-medium">{status.message}</span>
        </div>
      )}

      {status.type === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="font-medium">{status.message}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Account Name</Label>
        <Input id="name" name="name" placeholder="e.g. BDO Checking, Marketing Exp" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Financial Type</Label>
        {/* THE FIX: Apply the resetKey here to clear the "Ghost State" */}
        <Select key={resetKey} name="type" required>
          <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="asset">Asset (Banks/Cash)</SelectItem>
            <SelectItem value="revenue">Revenue (Income)</SelectItem>
            <SelectItem value="expense">Expense (Outflows)</SelectItem>
            <SelectItem value="liability">Liability (Loans/Payables)</SelectItem>
            <SelectItem value="equity">Equity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Sub-Category (Optional)</Label>
        <Input id="category" name="category" placeholder="e.g. Current Asset, Utility" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account_number">Bank / Account No. (Optional)</Label>
        <Input id="account_number" name="account_number" placeholder="e.g. 1010, 0001-2345" />
      </div>

      <div className="pt-2">
        <SubmitButton 
          title="Create Account" 
          loadingTitle="Creating..." 
          className="w-full bg-blue-600 text-white hover:bg-blue-700" 
        />
      </div>
    </form>
  );
}