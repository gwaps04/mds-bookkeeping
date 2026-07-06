// src/app/(dashboard)/admin/businesses/ManageBillingDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, ShieldAlert } from "lucide-react";
import { updateTenantBillingState } from "@/features/businesses/actions";
import SubmitButton from "@/components/SubmitButton";

export default function ManageBillingDialog({ 
  businessId, 
  businessName, 
  currentStatus 
}: { 
  businessId: string, 
  businessName: string,
  currentStatus: string 
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs bg-white text-purple-700 border-purple-200 hover:bg-purple-50">
          <CreditCard size={12} className="mr-1.5" /> Billing State
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700">
            <ShieldAlert size={18} /> Modify Billing State
          </DialogTitle>
          <DialogDescription>
            Override the commercial subscription status for <strong>{businessName}</strong>. This directly impacts their ledger access.
          </DialogDescription>
        </DialogHeader>
        
        <form action={async (formData) => {
          try {
            await updateTenantBillingState(formData);
            setOpen(false);
          } catch (e: any) {
            alert(e.message);
          }
        }} className="space-y-5 pt-4 border-t border-neutral-100">
          
          <input type="hidden" name="business_id" value={businessId} />

          <div className="space-y-2">
            <Label htmlFor="subscription_status">Current Status: <span className="uppercase font-bold text-neutral-900">{currentStatus}</span></Label>
            <Select name="subscription_status" defaultValue={currentStatus}>
              <SelectTrigger className="bg-neutral-50 border-neutral-200">
                <SelectValue placeholder="Select New State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trial">Trial (Limited Time)</SelectItem>
                <SelectItem value="active">Active (Paid / Full Access)</SelectItem>
                <SelectItem value="past_due">Past Due (Payment Failed)</SelectItem>
                <SelectItem value="suspended">Suspended (Admin Lockout)</SelectItem>
                <SelectItem value="canceled">Canceled (Churned)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-neutral-500 leading-relaxed mt-2">
              Note: Changing to 'Suspended', 'Canceled', or 'Past Due' will initiate a Soft-Lockout on the tenant's dashboard, graying out all mutation actions.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton 
              title="Apply Override" 
              loadingTitle="Updating..." 
              className="bg-purple-600 hover:bg-purple-700 text-white" 
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}