// src/app/(dashboard)/payroll/employees/EditEmployeeDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SubmitButton from "@/components/SubmitButton";
import { Pencil, Info } from "lucide-react";
import { updateEmployee } from "@/features/payroll/actions";

export default function EditEmployeeDialog({ employee }: { employee: any }) {
  const [open, setOpen] = useState(false);
  const [payType, setPayType] = useState(employee.pay_type);

  const handleSubmit = async (formData: FormData) => {
    try {
      await updateEmployee(formData);
      setOpen(false);
    } catch (error: any) {
      alert("Failed to update employee: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-indigo-600">
          <Pencil size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] md:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>Edit Employee Profile</DialogTitle>
          <DialogDescription className="text-xs md:text-sm">Update personal details, compensation, and statutory compliance.</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6 pt-4 border-t border-neutral-100">
          <input type="hidden" name="id" value={employee.id} />
          
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-1">1. Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>First Name</Label><Input name="first_name" required defaultValue={employee.first_name} /></div>
              <div className="space-y-1.5"><Label>Last Name</Label><Input name="last_name" required defaultValue={employee.last_name} /></div>
              <div className="space-y-1.5"><Label>Job Position</Label><Input name="position" required defaultValue={employee.position} /></div>
              <div className="space-y-1.5"><Label>Date Hired</Label><Input name="date_hired" type="date" required defaultValue={employee.date_hired} /></div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-1">2. Compensation Profile</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Pay Type</Label>
                <Select name="pay_type" value={payType} onValueChange={setPayType} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED_SALARY">Fixed Salary</SelectItem>
                    <SelectItem value="HOURLY">Hourly Rate</SelectItem>
                    <SelectItem value="COMMISSION">Commission Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{payType === "HOURLY" ? "Rate per Hour (₱)" : "Base Pay (₱)"}</Label>
                <Input name="base_rate" type="number" step="0.01" min="0" required defaultValue={employee.base_rate} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Pay Schedule</Label>
                <Select name="pay_schedule" defaultValue={employee.pay_schedule} required>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMI_MONTHLY">Semi-Monthly (15th/30th)</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 pb-1">3. Statutory Deductions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="checkbox" name="sss_enabled" defaultChecked={employee.sss_enabled} className="w-4 h-4 text-indigo-600 rounded" /><span className="font-bold text-sm">SSS Contribution</span></Label>
              <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="checkbox" name="philhealth_enabled" defaultChecked={employee.philhealth_enabled} className="w-4 h-4 text-indigo-600 rounded" /><span className="font-bold text-sm">PhilHealth</span></Label>
              <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="checkbox" name="pagibig_enabled" defaultChecked={employee.pagibig_enabled} className="w-4 h-4 text-indigo-600 rounded" /><span className="font-bold text-sm">Pag-IBIG (HDMF)</span></Label>
              <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50"><input type="checkbox" name="tax_enabled" defaultChecked={employee.tax_enabled} className="w-4 h-4 text-indigo-600 rounded" /><span className="font-bold text-sm">Withholding Tax</span></Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <SubmitButton title="Save Changes" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white" />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}