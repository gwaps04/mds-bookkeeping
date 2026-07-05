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
        <Button variant="destructive" size="sm" className="h-8 px-3 text-xs shadow-sm">
          Archive / Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertOctagon size={18} /> Require Authorization
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            You are about to modify the <strong>{accountName}</strong> ledger. If historical transactions exist, this account will be securely archived. Otherwise, it will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        
        <form action={async (formData) => {
          await deleteAccount(formData);
          setOpen(false); // Close modal on success
        }} className="space-y-4 pt-4 border-t border-neutral-100">
          
          <input type="hidden" name="id" value={accountId} />
          
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-neutral-900 font-semibold">
              Remarks / Reason for Action <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="reason" 
              name="reason" 
              placeholder="e.g., Bank account closed, No longer used..." 
              required 
              autoComplete="off"
            />
            <p className="text-[10px] text-neutral-500">This remark will be permanently recorded in the master audit trail.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton title="Confirm Action" loadingTitle="Processing..." className="bg-red-600 hover:bg-red-700 text-white" />
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}