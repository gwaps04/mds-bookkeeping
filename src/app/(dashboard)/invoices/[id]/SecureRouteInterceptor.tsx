// src/app/(dashboard)/invoices/[id]/SecureRouteInterceptor.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SecureRouteInterceptor({ targetUrl, trigger }: { targetUrl: string, trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();

  const isMatch = confirmText.trim().toLowerCase() === "edit";

  const handleProceed = () => {
    if (isMatch) {
      setOpen(false);
      router.push(targetUrl);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setConfirmText(""); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert size={18} /> Modify Invoice Record
          </DialogTitle>
          <DialogDescription>
            You are about to edit a finalized invoice. This is a highly sensitive action that will be permanently recorded in the master audit trail.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4 border-t border-neutral-100">
          <div className="space-y-2 bg-amber-50/50 p-3 rounded-md border border-amber-100">
            <Label className="text-neutral-900 font-semibold flex items-center gap-1.5">
              Type <span className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-800 font-mono select-none shadow-sm">edit</span> to confirm
            </Label>
            <Input 
              value={confirmText} 
              onChange={(e) => setConfirmText(e.target.value)} 
              placeholder="edit" 
              autoComplete="off"
              className="bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleProceed} disabled={!isMatch} className="bg-amber-600 hover:bg-amber-700 text-white transition-all">
              Unlock Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}