// src/app/(dashboard)/payroll/employees/AddEmployeeDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubmitButton from "@/components/SubmitButton";
import { UserPlus, Info } from "lucide-react";
import { createEmployee } from "@/features/payroll/actions";

export default function AddEmployeeDialog() {
  const [open, setOpen] = useState(false);
  const [payType, setPayType] = useState("FIXED_SALARY");

  const handleSubmit = async (formData: FormData) => {
    try {
      await createEmployee(formData);
      setOpen(false);
    } catch (error: any) {
      // THE FIX: Let Next.js handle the redirect without triggering the alert
      if (error.message === "NEXT_REDIRECT") throw error;
      
      alert("Failed to add employee: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm flex items-center gap-2">
          <UserPlus size={16} /> Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] md:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>Register New Employee</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            Add a team member to your payroll directory. Statutory deductions are optional.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6 pt-4 border-t border-neutral-100">
          
          {/* SECTION 1: PERSONAL DETAILS */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-1">1. Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input name="first_name" required placeholder="Juan" />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input name="last_name" required placeholder="Dela Cruz" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Job Position</Label>
                <Input name="position" required placeholder="e.g. Cashier, Developer" />
              </div>
              <div className="space-y-1.5">
                <Label>Date Hired</Label>
                <Input name="date_hired" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
          </div>

          {/* SECTION 2: COMPENSATION */}
          <div className="space-y-4 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-1">2. Compensation Profile</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <Label>Pay Type</Label>
                <Select name="pay_type" value={payType} onValueChange={setPayType} required>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED_SALARY">Fixed Salary</SelectItem>
                    <SelectItem value="HOURLY">Hourly Rate</SelectItem>
                    <SelectItem value="COMMISSION">Commission Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{payType === "HOURLY" ? "Rate per Hour (₱)" : "Base Pay (₱)"}</Label>
                <Input name="base_rate" type="number" step="0.01" min="0" required placeholder="0.00" />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label>Pay Schedule</Label>
                <Select name="pay_schedule" defaultValue="SEMI_MONTHLY" required>
                  <SelectTrigger><SelectValue placeholder="Select schedule..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMI_MONTHLY">Semi-Monthly (15th/30th)</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          </div>

          {/* SECTION 3: MSME STATUTORY COMPLIANCE (OPTIONAL) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">3. Statutory Deductions (Optional)</h4>
            </div>
            
            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-md flex gap-2 items-start text-blue-800 text-xs mb-3">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p>For MSMEs not yet formalized or for probationary staff, you can leave these unchecked. The system will skip these calculations during payroll generation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input type="checkbox" name="sss_enabled" className="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-neutral-900 text-sm">SSS Contribution</span>
                  <span className="text-[10px] text-neutral-500">Auto-calculate SSS bracket</span>
                </div>
              </Label>
              
              <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input type="checkbox" name="philhealth_enabled" className="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-neutral-900 text-sm">PhilHealth</span>
                  <span className="text-[10px] text-neutral-500">Auto-calculate premium</span>
                </div>
              </Label>

              <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input type="checkbox" name="pagibig_enabled" className="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-neutral-900 text-sm">Pag-IBIG (HDMF)</span>
                  <span className="text-[10px] text-neutral-500">Standard ₱200/month deduction</span>
                </div>
              </Label>

              <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input type="checkbox" name="tax_enabled" className="w-4 h-4 text-indigo-600 rounded border-neutral-300 focus:ring-indigo-500" />
                <div className="flex flex-col">
                  <span className="font-bold text-neutral-900 text-sm">Withholding Tax</span>
                  <span className="text-[10px] text-neutral-500">Apply BIR tax table calculation</span>
                </div>
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <SubmitButton title="Save Employee" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}