// src/app/(dashboard)/invoices/[id]/VoidPaymentDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Trash2, CheckCircle2 } from "lucide-react";
import { deleteIncome } from "@/features/income/actions";

export default function VoidPaymentDialog({ paymentId, amount, date }: { paymentId: string, amount: number, date: string }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const isMatch = confirmText.trim().toLowerCase() === "void";

  const handleAction = async () => {
    if (!isMatch || !reason.trim()) return;
    
    setStatus('loading');
    
    const formData = new FormData();
    formData.append("id", paymentId);
    formData.append("void_reason", reason);

    try {
      await deleteIncome(formData);
      
      setStatus('success');
      
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
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors">
          <Trash2 size={12} className="mr-1.5" /> Void
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        
        {status === 'success' ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <CheckCircle2 size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-neutral-900">Payment Voided</h3>
              <p className="text-sm text-neutral-500 mt-1">The ledger balance has been restored.</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <ShieldAlert size={18} /> Void Invoice Payment
              </DialogTitle>
              <DialogDescription>
                You are about to permanently void a payment of <strong>₱{Number(amount).toLocaleString('en-US')}</strong> received on <strong>{new Date(date).toLocaleDateString()}</strong>. This will restore the invoice balance.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              
              <div className="space-y-2">
                <Label className="text-neutral-900 font-bold">Mandatory Reason <span className="text-red-500">*</span></Label>
                <Textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="e.g. Logged to wrong invoice by mistake..." 
                  disabled={status === 'loading'}
                  className="resize-none bg-neutral-50 focus:bg-white" 
                />
              </div>

              <div className="space-y-2 bg-red-50/50 p-3 rounded-md border border-red-100">
                <Label className="text-red-900 font-semibold flex items-center gap-1.5">
                  Type <span className="px-1.5 py-0.5 bg-white border border-red-200 rounded text-red-700 font-mono shadow-sm select-none">void</span> to confirm
                </Label>
                <Input 
                  value={confirmText} 
                  onChange={(e) => setConfirmText(e.target.value)} 
                  placeholder="void" 
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
                  {status === 'loading' ? "Processing..." : "Void Payment"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}