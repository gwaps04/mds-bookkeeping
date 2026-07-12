// src/app/(dashboard)/payroll/NewRunDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubmitButton from "@/components/SubmitButton";
import { PlayCircle, CalendarRange, Gift } from "lucide-react";
import { createPayrollRun, create13thMonthRun } from "@/features/payroll/actions";

export default function NewRunDialog() {
  const [open, setOpen] = useState(false);

  const handleRegularSubmit = async (formData: FormData) => {
    try { 
      await createPayrollRun(formData); 
    } catch (error: any) { 
      if (error.message === "NEXT_REDIRECT") throw error; 
      alert("Validation Failed: " + error.message); 
    }
  };

  const handle13thSubmit = async (formData: FormData) => {
    try { 
      await create13thMonthRun(formData); 
    } catch (error: any) { 
      if (error.message === "NEXT_REDIRECT") throw error; 
      alert("Validation Failed: " + error.message); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm font-bold flex items-center gap-2 h-10 px-4 w-full sm:w-auto transition-all">
          <PlayCircle size={16} /> Run Payroll
        </Button>
      </DialogTrigger>
      
      {/* 
        THE FIX 1: Explicit aria-describedby binding ensures that even with complex 
        nested <Tabs> layouts, the Screen Reader always knows exactly where the description is.
      */}
      <DialogContent aria-describedby="payroll-dialog-description" className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-xl border-neutral-200 shadow-lg">
        
        <Tabs defaultValue="regular" className="w-full">
          <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 bg-neutral-50/80 border-b border-neutral-100">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-bold text-neutral-900">Generate Payroll Cycle</DialogTitle>
              <DialogDescription id="payroll-dialog-description" className="text-xs sm:text-sm text-neutral-500">
                Draft a new batch of payslips for active employees.
              </DialogDescription>
            </DialogHeader>
            <TabsList className="grid w-full grid-cols-2 p-1 bg-neutral-200/50 rounded-lg">
              <TabsTrigger value="regular" className="rounded-md text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">
                Regular Run
              </TabsTrigger>
              <TabsTrigger value="13th" className="rounded-md text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all">
                13th Month
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: REGULAR PAYROLL */}
          <TabsContent value="regular" className="m-0 p-5 sm:p-6">
            <form action={handleRegularSubmit} className="space-y-5">
              <div className="bg-indigo-50/50 border border-indigo-100 p-3 sm:p-4 rounded-lg flex items-start gap-3 shadow-sm">
                <CalendarRange size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                <div className="space-y-1 w-full min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-bold text-indigo-900 uppercase tracking-wider">Define the Work Period</h4>
                  <p className="text-[11px] sm:text-xs text-indigo-700/80 leading-relaxed">What dates are the employees being paid for?</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5 w-full">
                  <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">Start Date</Label>
                  <Input name="period_start" type="date" required className="w-full focus-visible:ring-indigo-600 bg-neutral-50" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">End Date</Label>
                  <Input name="period_end" type="date" required className="w-full focus-visible:ring-indigo-600 bg-neutral-50" />
                </div>
              </div>
              
              <div className="space-y-1.5 w-full">
                <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">Actual Payout Date</Label>
                <Input name="run_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full focus-visible:ring-indigo-600 bg-neutral-50" />
              </div>
              
              {/* THE FIX 2: Mobile-First Button Stacking */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-2 pt-5 border-t border-neutral-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto font-bold h-11 sm:h-10 text-neutral-600 border-neutral-200 hover:bg-neutral-50">
                  Cancel
                </Button>
                <SubmitButton title="Generate Drafts" loadingTitle="Calculating..." className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 sm:h-10 shadow-sm" />
              </div>
            </form>
          </TabsContent>

          {/* TAB 2: 13TH MONTH */}
          <TabsContent value="13th" className="m-0 p-5 sm:p-6">
            <form action={handle13thSubmit} className="space-y-5">
              <div className="bg-amber-50/50 border border-amber-100 p-3 sm:p-4 rounded-lg flex items-start gap-3 shadow-sm">
                <Gift size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-1 w-full min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">Prorated 13th Month Pay</h4>
                  <p className="text-[11px] sm:text-xs text-amber-800/80 leading-relaxed">DOLE dictates 13th month is exempt from standard tax deductions. It will be prorated by hire date.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5 w-full">
                  <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">Target Year</Label>
                  <Input name="year" type="number" required defaultValue={new Date().getFullYear()} className="w-full focus-visible:ring-amber-600 bg-neutral-50" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">Payout Date</Label>
                  <Input name="run_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full focus-visible:ring-amber-600 bg-neutral-50" />
                </div>
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-2 pt-5 border-t border-neutral-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto font-bold h-11 sm:h-10 text-neutral-600 border-neutral-200 hover:bg-neutral-50">
                  Cancel
                </Button>
                <SubmitButton title="Generate 13th Month" loadingTitle="Calculating..." className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 sm:h-10 shadow-sm" />
              </div>
            </form>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}