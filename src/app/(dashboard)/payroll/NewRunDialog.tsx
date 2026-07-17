// src/app/(dashboard)/payroll/NewRunDialog.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubmitButton from "@/components/SubmitButton";
// THE FIX: Imported AlertTriangle for the warning banner
import { PlayCircle, CalendarRange, Gift, UserMinus, AlertTriangle } from "lucide-react";
import { createPayrollRun, create13thMonthRun } from "@/features/payroll/actions";

// THE FIX: Added existingRuns to the component contract
export default function NewRunDialog({ employees, existingRuns }: { employees: any[], existingRuns: any[] }) {
  const [open, setOpen] = useState(false);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  
  // STATE: Track the dates in real-time for collision detection
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const handleRegularSubmit = async (formData: FormData) => {
    try { 
      await createPayrollRun(formData); 
    } catch (error: any) { 
      if (error.message === "NEXT_REDIRECT") throw error; 
      alert("Validation Failed: " + error.message); 
    }
  };

  const handle13thSubmit = async (formData: FormData) => {
    try { 
      await create13thMonthRun(formData); 
    } catch (error: any) { 
      if (error.message === "NEXT_REDIRECT") throw error; 
      alert("Validation Failed: " + error.message); 
    }
  };

  const toggleEmployee = (id: string) => {
    setExcludedIds(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
  };

  // ============================================================================
  // THE ENGINE: REAL-TIME OVERLAP COMPUTATION
  // ============================================================================
  const collidingRun = existingRuns.find(run => {
    // Ignore 13th month runs, as they legally span the entire year
    if (run.run_type === '13TH_MONTH') return false;

    const newStart = new Date(periodStart).setHours(0,0,0,0);
    const newEnd = new Date(periodEnd).setHours(0,0,0,0);
    const oldStart = new Date(run.period_start).setHours(0,0,0,0);
    const oldEnd = new Date(run.period_end).setHours(0,0,0,0);

    // Only run the check if both valid dates are entered
    if (isNaN(newStart) || isNaN(newEnd)) return false;

    // The universal formula for date range overlap: Start A <= End B AND End A >= Start B
    return newStart <= oldEnd && newEnd >= oldStart;
  });

  const StaffRoster = () => (
    <div className="space-y-2 mt-6 border-t border-neutral-100 pt-5">
      <div className="flex justify-between items-end mb-2">
        <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">
          Included Staff ({employees.length - excludedIds.length}/{employees.length})
        </Label>
        {excludedIds.length > 0 && (
          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1">
            <UserMinus size={10} /> {excludedIds.length} Excluded
          </span>
        )}
      </div>
      
      <div className="max-h-[160px] overflow-y-auto border border-neutral-200 rounded-lg bg-white divide-y divide-neutral-100 shadow-inner">
        {employees.length === 0 && (
           <div className="p-4 text-center text-sm text-neutral-500">No active employees found.</div>
        )}
        {employees.map(emp => {
          const isIncluded = !excludedIds.includes(emp.id);
          return (
            <label key={emp.id} className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${isIncluded ? 'hover:bg-indigo-50/50' : 'bg-neutral-50 opacity-60'}`}>
              <div className="flex items-center h-5">
                <input 
                  type="checkbox" 
                  checked={isIncluded}
                  onChange={() => toggleEmployee(emp.id)}
                  className="w-4 h-4 text-indigo-600 bg-neutral-100 border-neutral-300 rounded focus:ring-indigo-500 focus:ring-2"
                />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold truncate ${isIncluded ? 'text-neutral-900' : 'text-neutral-500 line-through decoration-neutral-300'}`}>
                  {emp.first_name} {emp.last_name}
                </p>
                <p className="text-[11px] text-neutral-500 font-medium truncate">{emp.position}</p>
              </div>
            </label>
          )
        })}
      </div>
      <input type="hidden" name="excluded_employees" value={JSON.stringify(excludedIds)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm font-bold flex items-center justify-center gap-2 h-11 sm:h-10 px-4 w-full sm:w-auto transition-all">
          <PlayCircle size={16} /> Run Payroll
        </Button>
      </DialogTrigger>
      
      <DialogContent aria-describedby="payroll-dialog-description" className="w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-xl border-neutral-200 shadow-lg">
        
        <Tabs defaultValue="regular" className="w-full">
          <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 bg-neutral-50/80 border-b border-neutral-100">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-bold text-neutral-900">Generate Payroll Cycle</DialogTitle>
              <DialogDescription id="payroll-dialog-description" className="text-xs sm:text-sm text-neutral-500">
                Draft a new batch of payslips. Uncheck an employee to exclude them.
              </DialogDescription>
            </DialogHeader>
            <TabsList className="grid w-full grid-cols-2 p-1 bg-neutral-200/50 rounded-lg">
              <TabsTrigger value="regular" className="rounded-md text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm transition-all">
                Regular Run
              </TabsTrigger>
              <TabsTrigger value="13th" className="rounded-md text-xs sm:text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all">
                13th Month
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="regular" className="m-0 p-5 sm:p-6">
            <form action={handleRegularSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5 w-full">
                  <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">Start Date</Label>
                  {/* Bind value and onChange to state */}
                  <Input name="period_start" type="date" required value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full focus-visible:ring-indigo-600 bg-neutral-50 h-11 sm:h-10" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">End Date</Label>
                  <Input name="period_end" type="date" required value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full focus-visible:ring-indigo-600 bg-neutral-50 h-11 sm:h-10" />
                </div>
              </div>
              
              <div className="space-y-1.5 w-full">
                <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">Actual Payout Date</Label>
                <Input name="run_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full focus-visible:ring-indigo-600 bg-neutral-50 h-11 sm:h-10" />
              </div>

              <StaffRoster />

              {/* THE FIX: DEFENSIVE UX WARNING BANNER */}
              {collidingRun && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 flex items-start gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">Date Collision Detected</p>
                    <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                      A cycle already exists overlapping these dates ({new Date(collidingRun.period_start).toLocaleDateString()} - {new Date(collidingRun.period_end).toLocaleDateString()}). Generating this draft may create duplicate payslips.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-2 pt-5 border-t border-neutral-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto font-bold h-11 sm:h-10 text-neutral-600 border-neutral-200 hover:bg-neutral-50">Cancel</Button>
                <SubmitButton title="Generate Drafts" loadingTitle="Calculating..." className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 sm:h-10 shadow-sm" />
              </div>
            </form>
          </TabsContent>

          <TabsContent value="13th" className="m-0 p-5 sm:p-6">
            <form action={handle13thSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1.5 w-full">
                  <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">Target Year</Label>
                  <Input name="year" type="number" required defaultValue={new Date().getFullYear()} className="w-full focus-visible:ring-amber-600 bg-neutral-50 h-11 sm:h-10" />
                </div>
                <div className="space-y-1.5 w-full">
                  <Label className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">Payout Date</Label>
                  <Input name="run_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full focus-visible:ring-amber-600 bg-neutral-50 h-11 sm:h-10" />
                </div>
              </div>

              <StaffRoster />
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-2 pt-5 border-t border-neutral-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto font-bold h-11 sm:h-10 text-neutral-600 border-neutral-200 hover:bg-neutral-50">Cancel</Button>
                <SubmitButton title="Generate 13th Month" loadingTitle="Calculating..." className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 sm:h-10 shadow-sm" />
              </div>
            </form>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}