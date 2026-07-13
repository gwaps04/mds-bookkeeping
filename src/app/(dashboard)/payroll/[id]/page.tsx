// src/app/(dashboard)/payroll/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Users, Calculator, Wallet, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

// Import the Action Bar we created
import PayrollStateActionBar from "@/features/payroll/components/PayrollStateActionBar"; 
import { saveDraftPayslips } from "@/features/payroll/actions";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PayrollReviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const runId = params.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ============================================================================
  // THE FIX: Upgraded query to fetch the Two-Key RBAC flags
  // ============================================================================
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      role, 
      can_access_payroll, 
      business_id, 
      businesses(currency, has_payroll_access)
    `)
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // ============================================================================
  // THE HARD GUARD: SERVER-SIDE SUB-ROUTE PROTECTION
  // ============================================================================
  const isSuperAdmin = profile?.role === 'super_admin';
  const isOwner = profile?.role === 'business_owner' || isSuperAdmin;
  const bizHasPayroll = bizData?.has_payroll_access === true;

  // Key 1: If the business doesn't pay for the module, kick EVERYONE out.
  if (!bizHasPayroll && !isSuperAdmin) {
    redirect("/dashboard");
  }

  // Key 2: If the user is a staff member WITHOUT explicit HR clearance, kick them out.
  if (!isOwner && profile?.can_access_payroll !== true) {
    redirect("/dashboard");
  }
  // ============================================================================

  // 1. Fetch the exact Payroll Run
  const { data: run } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .eq("business_id", businessId)
    .single();

  if (!run) redirect("/payroll");

  // 2. Fetch the generated Payslips & Employee details
  const { data: payslips } = await supabase
    .from("payslips")
    .select("*, employees(first_name, last_name, position, pay_type, base_rate, pay_schedule)")
    .eq("payroll_run_id", runId)
    .order("created_at", { ascending: true });

  // 3. Fetch Asset Accounts for the Disburse Dialog
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("type", "asset")
    .neq("is_archived", true)
    .order("name");

  const isDraft = run.status === 'DRAFT';
  const isFinalized = run.status === 'FINALIZED';
  const isPaid = run.status === 'PAID';

  const totalGross = (payslips || []).reduce((sum, slip) => sum + Number(slip.gross_pay), 0);
  const totalNet = (payslips || []).reduce((sum, slip) => sum + Number(slip.net_pay), 0);
  const totalDeductions = totalGross - totalNet;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12 w-full min-w-0 overflow-x-hidden">
      
      {/* HEADER & PIPELINE ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 w-full min-w-0">
        <div className="flex items-start gap-4">
          <Link href="/payroll">
            <Button variant="outline" size="icon" className="bg-white rounded-full mt-1 shrink-0"><ArrowLeft size={16} /></Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 leading-tight">Payroll Review</h2>
              
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border shadow-sm
                ${isDraft ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                  isFinalized ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                  'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {isDraft && <Clock size={14} className="shrink-0" />}
                {isFinalized && <AlertCircle size={14} className="shrink-0" />}
                {isPaid && <CheckCircle2 size={14} className="shrink-0" />}
                {isDraft ? 'Step 1: Draft Mode' : isFinalized ? 'Step 2: Awaiting Payout' : 'Step 3: Disbursed'}
              </span>
            </div>
            <p className="text-sm sm:text-base text-neutral-500 mt-1">
              Period: {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* INJECTING THE STATE MACHINE ACTION BAR */}
        <div className="shrink-0 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-neutral-200">
          <PayrollStateActionBar 
            runId={runId} 
            status={run.status} 
            totalGross={formatCurrency(totalGross)} 
            accounts={accounts || []} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
        
        {/* SUMMARY CARDS */}
        <div className="lg:col-span-1 space-y-6 w-full min-w-0">
          <Card className="shadow-sm border-neutral-200 bg-white">
            <CardContent className="p-5 space-y-6">
              
              <div className="flex items-center gap-4 border-b border-neutral-100 pb-5">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <Calculator size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Gross Pay</p>
                  <p className="text-xl font-bold text-neutral-900 mt-0.5">{formatCurrency(totalGross)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-b border-neutral-100 pb-5">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                  <Wallet size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Statutory Deductions</p>
                  <p className="text-xl font-bold text-neutral-900 mt-0.5 text-rose-600">-{formatCurrency(totalDeductions)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Net Disbursed</p>
                  <p className="text-2xl font-black text-emerald-700 mt-0.5">{formatCurrency(totalNet)}</p>
                </div>
              </div>

            </CardContent>
          </Card>

          {isDraft && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm text-sm text-amber-800 leading-relaxed">
              <p className="font-bold flex items-center gap-2 mb-1"><AlertCircle size={16} /> Draft Instructions</p>
              Adjust the hours worked, overtime, and commissions in the table to the right. Click <strong>Save Adjustments</strong> at the bottom to recalculate the taxes and net pay before finalizing.
            </div>
          )}
        </div>

        {/* PAYSLIP EDITOR TABLE */}
        <div className="lg:col-span-2 w-full min-w-0">
          <form action={saveDraftPayslips} className="space-y-4">
            <input type="hidden" name="run_id" value={runId} />
            
            <Card className="shadow-sm border-neutral-200 flex flex-col bg-white overflow-hidden w-full min-w-0">
              <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4">
                <CardTitle className="text-lg">Employee Calculations</CardTitle>
              </CardHeader>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                  <thead className="bg-white border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-neutral-600 text-xs">Employee</th>
                      <th className="px-4 py-3 font-semibold text-neutral-600 text-xs text-center">Reg. Hrs</th>
                      <th className="px-4 py-3 font-semibold text-neutral-600 text-xs text-center">OT Hrs</th>
                      <th className="px-4 py-3 font-semibold text-neutral-600 text-xs text-right">Commission</th>
                      <th className="px-4 py-3 font-semibold text-neutral-600 text-xs text-right">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {(payslips || []).map((slip: any) => {
                      const emp = slip.employees;
                      return (
                        <tr key={slip.id} className="hover:bg-neutral-50/50">
                          <td className="px-4 py-4">
                            <p className="font-bold text-neutral-900">{emp.first_name} {emp.last_name}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">{emp.position} • {emp.pay_type}</p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <input 
                              type="number" 
                              name={`hours_worked_${slip.id}`} 
                              defaultValue={slip.hours_worked || 0} 
                              disabled={!isDraft || emp.pay_type === 'FIXED_SALARY'}
                              className="w-16 h-8 text-center border border-neutral-200 rounded text-xs disabled:bg-neutral-100" 
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <input 
                              type="number" 
                              name={`overtime_hours_${slip.id}`} 
                              defaultValue={slip.overtime_hours || 0} 
                              disabled={!isDraft || emp.pay_type === 'COMMISSION'}
                              className="w-16 h-8 text-center border border-neutral-200 rounded text-xs disabled:bg-neutral-100" 
                            />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <input 
                              type="number" 
                              name={`commission_earned_${slip.id}`} 
                              defaultValue={slip.commission_earned || 0} 
                              disabled={!isDraft}
                              className="w-24 h-8 text-right px-2 border border-neutral-200 rounded text-xs disabled:bg-neutral-100" 
                            />
                          </td>
                          <td className="px-4 py-4 text-right">
                            <p className="font-bold text-emerald-700">{formatCurrency(Number(slip.net_pay))}</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">Gross: {formatCurrency(Number(slip.gross_pay))}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isDraft && (
                <div className="bg-neutral-50/80 p-4 border-t border-neutral-100 flex justify-end">
                  <SubmitButton title="Save Adjustments" loadingTitle="Recalculating Taxes..." className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold h-10 px-6 shadow-sm" />
                </div>
              )}
            </Card>
          </form>
        </div>

      </div>
    </div>
  );
}