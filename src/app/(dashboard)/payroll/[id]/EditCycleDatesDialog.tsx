// src/app/(dashboard)/payroll/[id]/EditCycleDatesDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SubmitButton from "@/components/SubmitButton";
// THE FIX: Changed 'CalendarEdit' to 'Calendar' to ensure compatibility with your lucide-react version
import { Calendar } from "lucide-react"; 
import { updatePayrollCycleDates } from "@/features/payroll/actions";

interface EditCycleProps {
  runId: string;
  currentStart: string;
  currentEnd: string;
  currentPayout: string;
  status: string;
}

export default function EditCycleDatesDialog({ runId, currentStart, currentEnd, currentPayout, status }: EditCycleProps) {
  const [open, setOpen] = useState(false);

  // UX STATE GUARD: Only render the button if the cycle is a draft
  if (status !== 'DRAFT') return null;

  const handleSubmit = async (formData: FormData) => {
    try {
      await updatePayrollCycleDates(formData);
      setOpen(false); // Close modal on success
    } catch (error: any) {
      alert("Failed to update dates: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 bg-white text-neutral-500 hover:text-indigo-600 border-neutral-200 hover:border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm ml-3">
          <Calendar size={12} className="mr-1.5" /> Edit Dates
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-[95vw] sm:max-w-[400px] rounded-xl border-neutral-200 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-neutral-900">Edit Cycle Dates</DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            Update the working period and payout date for this draft.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4 pt-2">
          <input type="hidden" name="run_id" value={runId} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Start Date</Label>
              <Input name="period_start" type="date" required defaultValue={currentStart} className="h-10 focus-visible:ring-indigo-600" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">End Date</Label>
              <Input name="period_end" type="date" required defaultValue={currentEnd} className="h-10 focus-visible:ring-indigo-600" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Actual Payout Date</Label>
            <Input name="run_date" type="date" required defaultValue={currentPayout} className="h-10 focus-visible:ring-indigo-600" />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100 mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 text-neutral-600 hover:bg-neutral-50">Cancel</Button>
            <SubmitButton title="Save Changes" loadingTitle="Saving..." className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 shadow-sm" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}