// src/features/payroll/components/PayrollStateActionBar.tsx
"use client";

import { useState } from "react";
import { finalizePayrollRun, revertPayrollToDraft } from "@/features/payroll/actions";
import SubmitButton from "@/components/SubmitButton";
import DisburseDialog from "@/app/(dashboard)/payroll/[id]/DisburseDialog";
import { CheckCircle2, Unlock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function PayrollStateActionBar({
  runId,
  status,
  totalGross,
  accounts
}: {
  runId: string;
  status: string;
  totalGross: string;
  accounts: any[];
}) {
  const [unlockOpen, setUnlockOpen] = useState(false);

  const handleUnlock = async (formData: FormData) => {
    try {
      await revertPayrollToDraft(formData);
      setUnlockOpen(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto min-w-0">
      
      {/* STATE 1: DRAFT -> User can lock the calculations */}
      {status === 'DRAFT' && (
         <form action={finalizePayrollRun} className="w-full sm:w-auto">
            <input type="hidden" name="run_id" value={runId} />
            <SubmitButton
              title="Finalize Calculations"
              loadingTitle="Locking..."
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm h-11 sm:h-10 px-6 transition-all"
            />
         </form>
      )}

      {/* STATE 2: FINALIZED -> User can select a bank OR Unlock the Draft */}
      {status === 'FINALIZED' && (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          
          {/* THE NEW UNLOCK MODAL */}
          <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto h-11 sm:h-10 text-neutral-600 font-bold border-neutral-200 hover:bg-neutral-50 shadow-sm transition-all">
                <Unlock size={16} className="mr-2" /> Edit Draft
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Unlock Payroll Calculations?</DialogTitle>
                <DialogDescription>
                  This will revert the payroll run back to Draft mode, allowing you to edit hours, overtime, and commissions. You will need to re-finalize it before you can disburse funds.
                </DialogDescription>
              </DialogHeader>
              
              <form action={handleUnlock} className="flex justify-end gap-2 pt-4 border-t border-neutral-100 mt-2">
                <input type="hidden" name="run_id" value={runId} />
                <Button type="button" variant="outline" onClick={() => setUnlockOpen(false)}>Cancel</Button>
                <SubmitButton title="Yes, Unlock" className="bg-amber-600 hover:bg-amber-700 text-white font-bold" />
              </form>
            </DialogContent>
          </Dialog>

          <DisburseDialog 
            runId={runId} 
            accounts={accounts} 
            totalGross={totalGross} 
          />
        </div>
      )}

      {/* STATE 3: PAID -> The ledger is immutable */}
      {status === 'PAID' && (
         <div className="flex items-center gap-2 px-5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-bold text-sm shadow-sm w-full sm:w-auto justify-center h-11 sm:h-10">
           <CheckCircle2 size={16} className="shrink-0" /> Disbursed & Posted
         </div>
      )}
      
    </div>
  );
}