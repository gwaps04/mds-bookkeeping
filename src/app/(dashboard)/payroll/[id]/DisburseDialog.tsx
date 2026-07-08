// src/app/(dashboard)/payroll/[id]/DisburseDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubmitButton from "@/components/SubmitButton";
import { Send, Landmark } from "lucide-react";
import { disbursePayrollRun } from "@/features/payroll/actions";

export default function DisburseDialog({ runId, accounts, totalGross }: { runId: string, accounts: any[], totalGross: string }) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    try {
      await disbursePayrollRun(formData);
      setOpen(false);
    } catch (error: any) {
      if (error.message === "NEXT_REDIRECT") throw error;
      alert("Failed to disburse funds: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2">
          <Send size={16} /> Disburse Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Disburse Payroll</DialogTitle>
          <DialogDescription>
            This will lock the payroll cycle and automatically post a <strong>{totalGross}</strong> expense entry to your Salaries & Wages ledger.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6 pt-4 border-t border-neutral-100">
          <input type="hidden" name="run_id" value={runId} />

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Landmark size={14} className="text-neutral-500" /> Paid From (Asset Account)</Label>
            <Select name="account_id" required>
              <SelectTrigger><SelectValue placeholder="Select bank or cash account..." /></SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-neutral-500 mt-1">This will deduct the funds from your selected asset account.</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton title="Confirm Payout" loadingTitle="Posting Ledger..." className="bg-emerald-600 hover:bg-emerald-700 text-white" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}