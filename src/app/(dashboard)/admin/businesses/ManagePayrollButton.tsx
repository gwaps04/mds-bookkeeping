// src/app/(dashboard)/admin/businesses/ManagePayrollButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Briefcase, Lock, Users } from "lucide-react";
import { updateWorkspaceAccess } from "@/features/admin/actions";

export default function ManagePayrollButton({ 
  businessId, 
  businessName, 
  currentAccess 
}: { 
  businessId: string; 
  businessName: string; 
  currentAccess: boolean; 
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleToggle = async (action: 'enable' | 'disable') => {
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("business_id", businessId);
      formData.append("feature", "payroll");
      formData.append("action", action);
      
      await updateWorkspaceAccess(formData);
      setOpen(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {currentAccess ? (
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 font-semibold shadow-sm">
            <Users size={14} className="mr-1.5" /> Payroll Active
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100 font-medium">
            <Lock size={12} className="mr-1.5" /> Payroll Locked
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-600" />
            Manage Payroll Access
          </DialogTitle>
          <DialogDescription>
            Configure HR & Payroll engine provisioning for <strong className="text-neutral-900">{businessName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col gap-4 items-center text-center">
          {currentAccess ? (
            <>
              <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-2">
                <Users size={32} />
              </div>
              <div>
                <p className="font-bold text-neutral-900 text-lg">Payroll is Currently ACTIVE</p>
                <p className="text-sm text-neutral-500 mt-1">This tenant has full access to Employee Management, DOLE statutory calculations, and Payslip generation.</p>
              </div>
              <Button onClick={() => handleToggle('disable')} disabled={isPending} className="w-full mt-4 bg-neutral-900 hover:bg-neutral-800 text-white">
                {isPending ? "Updating..." : "Lock / Revoke Access"}
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mb-2">
                <Lock size={32} />
              </div>
              <div>
                <p className="font-bold text-neutral-900 text-lg">Payroll is Currently LOCKED</p>
                <p className="text-sm text-neutral-500 mt-1">Unlock this module to grant the tenant access to the HR & Payroll engine.</p>
              </div>
              <Button onClick={() => handleToggle('enable')} disabled={isPending} className="w-full mt-4 bg-sky-600 hover:bg-sky-700 text-white shadow-sm">
                {isPending ? "Updating..." : "Unlock & Provision"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}