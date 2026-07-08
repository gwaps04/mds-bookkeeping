// src/app/(dashboard)/admin/businesses/ManageInventoryButton.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toggleInventoryAccess } from "@/features/admin/actions";
import { PackageSearch, CheckCircle2, XCircle } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";

export default function ManageInventoryButton({ businessId, businessName, currentAccess }: { businessId: string, businessName: string, currentAccess: boolean }) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    try {
      await toggleInventoryAccess(formData);
      setOpen(false);
    } catch (error: any) {
      alert("Failed to update access: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={`h-8 px-2.5 text-[11px] font-medium border shadow-sm transition-colors ${currentAccess ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'}`}>
          <PackageSearch size={12} className="mr-1.5" />
          {currentAccess ? 'ERP Active' : 'ERP Locked'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Inventory Access</DialogTitle>
          <DialogDescription>
            Enable or disable the advanced ERP Inventory & Recipe engine for <strong>{businessName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-6 pt-4 border-t border-neutral-100">
          <input type="hidden" name="business_id" value={businessId} />
          <input type="hidden" name="has_access" value={currentAccess ? "false" : "true"} />

          <div className={`p-4 rounded-lg border ${currentAccess ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className="flex items-start gap-3">
              {currentAccess ? <XCircle className="text-red-600 mt-0.5 shrink-0" /> : <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" />}
              <div>
                <h4 className={`text-sm font-bold ${currentAccess ? 'text-red-900' : 'text-emerald-900'}`}>
                  {currentAccess ? 'Revoke ERP Access' : 'Provision ERP Access'}
                </h4>
                <p className={`text-xs mt-1 ${currentAccess ? 'text-red-700' : 'text-emerald-700'}`}>
                  {currentAccess 
                    ? "They will lose access to the Inventory Catalog, Recipe Engine, and automated stock deductions." 
                    : "They will gain full access to the 4-tier Inventory Catalog and automated COGS Recipe Engine."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton 
              title={currentAccess ? "Lock Inventory" : "Enable Inventory"} 
              className={currentAccess ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"} 
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}