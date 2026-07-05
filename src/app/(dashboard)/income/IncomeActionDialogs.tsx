// src/app/(dashboard)/income/IncomeActionDialogs.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteIncome } from "@/features/income/actions";

// ============================================================================
// 1. SECURE EDIT INTERCEPTOR
// ============================================================================
export function IncomeEditInterceptor({ targetUrl }: { targetUrl: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const isMatch = confirmText.trim().toLowerCase() === "edit";

  const handleProceed = () => {
    if (isMatch) {
      setIsLoading(true);
      router.push(targetUrl);
      // We don't close the modal or reset loading so it acts as a visual block while Next.js routes!
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isLoading) { setOpen(val); setConfirmText(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors">
          <Edit2 size={12} className="mr-1.5" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <ShieldAlert size={18} /> Modify Income Ledger
          </DialogTitle>
          <DialogDescription>
            You are about to edit a posted financial record. This action will be permanently tracked in the Audit Log.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4 border-t border-neutral-100">
          <div className="space-y-2 bg-blue-50/50 p-3 rounded-md border border-blue-100">
            <Label className="text-neutral-900 font-semibold flex items-center gap-1.5">
              Type <span className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-800 font-mono shadow-sm select-none">edit</span> to proceed
            </Label>
            <Input 
              value={confirmText} 
              onChange={(e) => setConfirmText(e.target.value)} 
              placeholder="edit" 
              autoComplete="off"
              disabled={isLoading}
              className="bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button onClick={handleProceed} disabled={!isMatch || isLoading} className="bg-blue-600 hover:bg-blue-700 text-white transition-all w-32">
              {isLoading ? "Loading..." : "Unlock Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. SECURE DELETE / VOID DIALOG WITH SUCCESS STATE
// ============================================================================
export function IncomeDeleteDialog({ incomeId, amount, clientName }: { incomeId: string, amount: number, clientName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const isMatch = confirmText.trim().toLowerCase() === "delete";

  const handleAction = async () => {
    if (!isMatch || !reason.trim()) return;
    
    setStatus('loading');
    
    const formData = new FormData();
    formData.append("id", incomeId);
    formData.append("void_reason", reason);

    try {
      await deleteIncome(formData);
      
      // TRIGGER THE SUCCESS STATE
      setStatus('success');
      
      // Wait 1.5 seconds so the user can read the success message, then reload the UI
      setTimeout(() => {
        setOpen(false);
        window.location.reload();
      }, 1500);

    } catch (error: any) {
      alert("SERVER ERROR: " + error.message);
      setStatus('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (status !== 'loading' && status !== 'success') { setOpen(val); setConfirmText(""); setReason(""); } }}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="h-8 px-3 text-xs shadow-sm">
          <Trash2 size={12} className="mr-1.5" /> Void
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        
        {status === 'success' ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-neutral-900">Record Voided</h3>
              <p className="text-sm text-neutral-500 mt-1">The ledger and audit trail have been updated.</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <ShieldAlert size={18} /> Void Direct Income
              </DialogTitle>
              <DialogDescription>
                You are permanently voiding a receipt of <strong>₱{Number(amount).toLocaleString('en-US')}</strong> from <strong>{clientName || 'Walk-in'}</strong>.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              
              <div className="space-y-2">
                <Label className="text-neutral-900 font-bold">Mandatory Reason <span className="text-red-500">*</span></Label>
                <Textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="e.g. Duplicate entry, refund issued..." 
                  disabled={status === 'loading'}
                  className="resize-none bg-neutral-50 focus:bg-white" 
                />
              </div>

              <div className="space-y-2 bg-red-50/50 p-3 rounded-md border border-red-100">
                <Label className="text-red-900 font-semibold flex items-center gap-1.5">
                  Type <span className="px-1.5 py-0.5 bg-white border border-red-200 rounded text-red-700 font-mono shadow-sm select-none">delete</span> to confirm
                </Label>
                <Input 
                  value={confirmText} 
                  onChange={(e) => setConfirmText(e.target.value)} 
                  placeholder="delete" 
                  autoComplete="off"
                  disabled={status === 'loading'}
                  className="bg-white border-red-200 focus-visible:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={status === 'loading'}>Cancel</Button>
                <Button 
                  onClick={handleAction} 
                  disabled={!isMatch || !reason.trim() || status === 'loading'} 
                  variant="destructive" 
                  className="transition-all w-36"
                >
                  {status === 'loading' ? "Processing..." : "Void Record"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}