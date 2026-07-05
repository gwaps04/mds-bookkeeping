// src/app/(dashboard)/invoices/[id]/EditPaymentDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateInvoicePayment, deleteInvoicePayment, requestPaymentVoid } from "@/features/invoices/actions"; 
import { ShieldAlert, Edit2, Trash2, Save, Send } from "lucide-react";

export default function EditPaymentDialog({ payment, invoiceId, clientName, userRole, allowStaffVoid }: { payment: any, invoiceId: string, clientName: string, userRole: string, allowStaffVoid?: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [amount, setAmount] = useState(payment.amount.toString());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  
  const isOwner = userRole === 'business_owner' || userRole === 'super_admin';
  const canVoid = isOwner || allowStaffVoid; // NEW: The Gatekeeper
  
  const isEditMatch = confirmText.trim().toLowerCase() === "edit";
  const isDeleteMatch = confirmText.trim().toLowerCase() === "delete";
  
  const numAmount = parseFloat(amount);
  const isValidAmount = !isNaN(numAmount) && numAmount > 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  };

  const handleUpdate = async (formData: FormData) => {
    setIsProcessing("Saving...");
    try {
      await updateInvoicePayment(formData);
      setOpen(false);
      window.location.reload(); 
    } catch (error: any) { alert("SERVER ERROR: " + error.message); setIsProcessing(null); }
  };

  const handleDeleteOrRequest = async (formData: FormData) => {
    setIsProcessing(isOwner ? "Voiding..." : "Submitting Request...");
    try {
      if (isOwner) {
        await deleteInvoicePayment(formData);
      } else {
        await requestPaymentVoid(formData);
      }
      setOpen(false);
      window.location.reload(); 
    } catch (error: any) { alert("SERVER ERROR: " + error.message); setIsProcessing(null); }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setConfirmText(""); setIsProcessing(null); setAmount(payment.amount.toString()); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] uppercase font-bold tracking-wider text-neutral-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors">
          <Edit2 size={10} className="mr-1" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <ShieldAlert size={18} /> Modify Posted Payment
          </DialogTitle>
          <DialogDescription>
            {isOwner ? "You are a Business Owner. Voiding this payment will instantly mutate the ledger." : "Modifying a posted transaction is strictly audited."}
          </DialogDescription>
        </DialogHeader>
        
        <form className="space-y-4 pt-4 border-t border-neutral-100">
          
          <input type="hidden" name="payment_id" value={payment.id} />
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <input type="hidden" name="client_name" value={clientName} />
          <input type="hidden" name="old_amount" value={payment.amount} />

          {isDeleteMatch && canVoid ? (
            <div className="space-y-2 bg-red-50 p-3 rounded-md border border-red-100 animate-in fade-in slide-in-from-top-2">
              <Label className="text-red-900 font-bold">Reason for Voiding <span className="text-red-500">*</span></Label>
              <Textarea name="void_reason" placeholder="e.g. Bounced check, duplicate entry..." required className="bg-white resize-none" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className={!isValidAmount && amount !== "" ? "text-red-600" : ""}>
                  New Amount (₱) {(!isValidAmount && amount !== "") && <span className="text-red-600 font-normal text-xs">- Must be greater than 0</span>}
                </Label>
                <Input name="amount" type="text" value={amount} onChange={handleAmountChange} className={!isValidAmount && amount !== "" ? "border-red-500 bg-red-50" : ""} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New Date</Label>
                  <Input name="date" type="date" defaultValue={payment.date} required />
                </div>
                <div className="space-y-2">
                  <Label>Notes / Ref</Label>
                  <Input name="description" defaultValue={payment.description} required />
                </div>
              </div>
            </>
          )}

          <div className="mt-6 p-4 bg-neutral-50 rounded-md border border-neutral-200 space-y-3">
            <Label className="text-xs text-neutral-600 font-semibold leading-relaxed block">
              Type <span className="font-mono text-neutral-900 font-bold bg-white px-1.5 py-0.5 border rounded">edit</span> to save changes
              {canVoid && <>, or <span className="font-mono text-red-700 font-bold bg-white px-1.5 py-0.5 border rounded border-red-200">delete</span> to void this payment</>}.
            </Label>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={canVoid ? "edit / delete" : "edit"} autoComplete="off" className="h-9 text-sm font-mono" />
          </div>

          <div className="flex gap-2 pt-2">
            {canVoid && (
              <Button 
                formAction={handleDeleteOrRequest}
                type="submit"
                disabled={!isDeleteMatch || isProcessing !== null}
                variant="destructive"
                className={`flex-1 transition-all ${isDeleteMatch ? "opacity-100" : "opacity-50 grayscale cursor-not-allowed"}`}
              >
                {isProcessing === "Voiding..." || isProcessing === "Submitting Request..." 
                  ? "Processing..." 
                  : isOwner 
                    ? <><Trash2 size={16} className="mr-2"/> Void Instantly</>
                    : <><Send size={16} className="mr-2"/> Request Void</>
                }
              </Button>
            )}

            <Button 
              formAction={handleUpdate}
              type="submit"
              disabled={!isEditMatch || !isValidAmount || isProcessing !== null}
              className={`flex-1 transition-all ${isEditMatch && isValidAmount ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-neutral-200 text-neutral-400 cursor-not-allowed"}`}
            >
              {isProcessing === "Saving..." ? "Processing..." : <><Save size={16} className="mr-2"/> Save Edit</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}