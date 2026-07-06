// src/app/(dashboard)/admin/businesses/ApproveTenantDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { approveBusiness } from "@/features/businesses/actions";
import SubmitButton from "@/components/SubmitButton";

export default function ApproveTenantDialog({ businessId, businessName }: { businessId: string, businessName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all">
          <ShieldCheck size={14} className="mr-1.5" /> Approve
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle2 size={18} /> Provision New Tenant
          </DialogTitle>
          <DialogDescription>
            Configure billing parameters and activate <strong>{businessName}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <form action={async (formData) => {
          try {
            await approveBusiness(formData);
            setOpen(false);
          } catch (e: any) {
            alert(e.message);
          }
        }} className="space-y-5 pt-4 border-t border-neutral-100">
          
          <input type="hidden" name="business_id" value={businessId} />

          <div className="space-y-2">
            <Label htmlFor="tier">Subscription Tier</Label>
            <Select name="tier" defaultValue="essential">
              <SelectTrigger className="bg-neutral-50 border-neutral-200">
                <SelectValue placeholder="Select Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essential">Macrobiz Essential (₱416/mo)</SelectItem>
                <SelectItem value="pro">Business Pro (₱833/mo) - Coming Soon</SelectItem>
                <SelectItem value="enterprise">Large Custom Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-neutral-500">Defines the structural limits (e.g., max staff, orgs).</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trial_days">Trial Duration</Label>
            <Select name="trial_days" defaultValue="15">
              <SelectTrigger className="bg-neutral-50 border-neutral-200">
                <SelectValue placeholder="Select Trial Length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="15">15 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-neutral-500">The platform will soft-lock the tenant after this period.</p>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton 
              title="Activate Tenant" 
              loadingTitle="Provisioning..." 
              className="bg-green-600 hover:bg-green-700 text-white" 
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}