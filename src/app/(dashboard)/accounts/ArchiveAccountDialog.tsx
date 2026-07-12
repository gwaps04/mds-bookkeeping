// src/app/(dashboard)/accounts/ArchiveAccountDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import SubmitButton from "@/components/SubmitButton";
import { deleteAccount } from "@/features/accounts/actions";
import { AlertOctagon } from "lucide-react";

export default function ArchiveAccountDialog({ accountId, accountName }: { accountId: string, accountName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="h-8 sm:h-9 px-3 text-xs shadow-sm font-bold w-full sm:w-auto">
          Archive / Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[425px] p-4 sm:p-6 rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 text-lg">
            <AlertOctagon size={18} /> Require Authorization
          </DialogTitle>
          <DialogDescription className="leading-relaxed text-xs sm:text-sm">
            You are about to modify the <strong className="text-neutral-900">{accountName}</strong> ledger. If historical transactions exist, this account will be securely archived. Otherwise, it will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        
        <form action={async (formData) => {
          await deleteAccount(formData);
          setOpen(false); 
        }} className="space-y-4 pt-4 border-t border-neutral-100 w-full">
          
          <input type="hidden" name="id" value={accountId} />
          
          <div className="space-y-1.5 w-full">
            <Label htmlFor="reason" className="text-neutral-900 font-semibold text-xs sm:text-sm">
              Remarks / Reason for Action <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="reason" 
              name="reason" 
              placeholder="e.g., Bank account closed, No longer used..." 
              required 
              autoComplete="off"
              className="w-full focus-visible:ring-red-600"
            />
            <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-1">This remark will be permanently recorded in the master audit trail.</p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto font-bold">
              Cancel
            </Button>
            <SubmitButton 
              title="Confirm Action" 
              loadingTitle="Processing..." 
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm" 
            />
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}