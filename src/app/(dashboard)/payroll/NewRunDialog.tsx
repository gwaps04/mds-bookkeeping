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
    try { await createPayrollRun(formData); } 
    catch (error: any) { if (error.message === "NEXT_REDIRECT") throw error; alert("Validation Failed: " + error.message); }
  };

  const handle13thSubmit = async (formData: FormData) => {
    try { await create13thMonthRun(formData); } 
    catch (error: any) { if (error.message === "NEXT_REDIRECT") throw error; alert("Validation Failed: " + error.message); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm flex items-center gap-2">
          <PlayCircle size={16} /> Run Payroll
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] md:max-w-[450px] p-0 overflow-hidden">
        
        <Tabs defaultValue="regular" className="w-full">
          <div className="px-6 pt-6 pb-2 bg-neutral-50 border-b border-neutral-100">
            <DialogHeader className="mb-4">
              <DialogTitle>Generate Payroll Cycle</DialogTitle>
              <DialogDescription className="text-xs">Draft a new batch of payslips for active employees.</DialogDescription>
            </DialogHeader>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="regular">Regular Run</TabsTrigger>
              <TabsTrigger value="13th">13th Month</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="regular" className="m-0 p-6 pt-4">
            <form action={handleRegularSubmit} className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-start gap-3">
                <CalendarRange size={20} className="text-indigo-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-indigo-900">Define the Work Period</h4>
                  <p className="text-xs text-indigo-700">What dates are the employees being paid for?</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Start Date</Label><Input name="period_start" type="date" required /></div>
                <div className="space-y-2"><Label>End Date</Label><Input name="period_end" type="date" required /></div>
              </div>
              <div className="space-y-2">
                <Label>Actual Payout Date</Label>
                <Input name="run_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto mt-2">Cancel</Button>
                <SubmitButton title="Generate Drafts" loadingTitle="Calculating..." className="w-full sm:w-auto bg-indigo-600 mt-2" />
              </div>
            </form>
          </TabsContent>

          <TabsContent value="13th" className="m-0 p-6 pt-4">
            <form action={handle13thSubmit} className="space-y-6">
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-3">
                <Gift size={20} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900">Prorated 13th Month Pay</h4>
                  <p className="text-xs text-amber-700">DOLE dictates 13th month is exempt from SSS, PHIC, HDMF, and standard tax. It will be prorated by hire date.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Year</Label>
                  <Input name="year" type="number" required defaultValue={new Date().getFullYear()} />
                </div>
                <div className="space-y-2">
                  <Label>Payout Date</Label>
                  <Input name="run_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto mt-2">Cancel</Button>
                <SubmitButton title="Generate 13th Month" loadingTitle="Calculating..." className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white mt-2" />
              </div>
            </form>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}