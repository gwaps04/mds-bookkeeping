// src/app/(dashboard)/payroll/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Calculator, AlertCircle, ShieldOff, CheckCircle2 } from "lucide-react";
import { saveDraftPayslips, finalizePayrollRun } from "@/features/payroll/actions";
import DisburseDialog from "./DisburseDialog";

export default async function PayrollRunDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const runId = params.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id, businesses(currency)").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  const bizData = profile?.businesses as any;
  const currency = Array.isArray(bizData) ? bizData[0]?.currency : bizData?.currency || "PHP";

  const { data: run } = await supabase.from("payroll_runs").select("*").eq("id", runId).eq("business_id", businessId).single();
  if (!run) redirect("/payroll");

  const { data: payslips } = await supabase
    .from("payslips")
    .select(`id, hours_worked, overtime_hours, commission_earned, gross_pay, net_pay, breakdown, employees!inner ( first_name, last_name, position, pay_type, base_rate, sss_enabled, philhealth_enabled, pagibig_enabled, tax_enabled )`)
    .eq("payroll_run_id", runId)
    .order("employees(first_name)", { ascending: true });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  
  const isDraft = run.status === 'DRAFT';
  const isFinalized = run.status === 'FINALIZED';
  const isPaid = run.status === 'PAID';
  const is13thMonth = run.run_type === '13TH_MONTH';
  
  const totalGross = (payslips || []).reduce((sum, slip) => sum + Number(slip.gross_pay), 0);
  const totalNet = (payslips || []).reduce((sum, slip) => sum + Number(slip.net_pay), 0);

  // FETCH ASSET ACCOUNTS FOR DISBURSEMENT
  let bankAccounts: any[] = [];
  if (isFinalized) {
    const { data } = await supabase.from("accounts").select("id, name").eq("business_id", businessId).in("type", ["asset", "liability"]).order("name");
    bankAccounts = data || [];
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/payroll"><Button variant="outline" size="icon" className="bg-white rounded-full"><ArrowLeft size={16} /></Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">Payroll Cycle Details</h2>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isDraft ? 'bg-amber-100 text-amber-800' : isFinalized ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {isDraft ? 'Draft' : isFinalized ? 'Finalized' : 'Disbursed'}
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              {is13thMonth 
                ? `13th Month Pay (${new Date(run.period_start).getFullYear()})` 
                : `Period: ${new Date(run.period_start).toLocaleDateString()} to ${new Date(run.period_end).toLocaleDateString()}`
              }
            </p>
          </div>
        </div>

        {/* WORKFLOW ACTIONS */}
        <div className="flex items-center gap-2">
          
          {/* THE NEW PRINT BUTTON */}
          <Link href={`/payroll/${run.id}/print`} target="_blank">
            <Button variant="outline" className="bg-white border-neutral-200">
              Print Payslips
            </Button>
          </Link>

          {isDraft && (
            <form action={async (formData) => { "use server"; await finalizePayrollRun(formData); }}>
              <input type="hidden" name="run_id" value={run.id} />
              <input type="hidden" name="business_id" value={businessId} />
              <SubmitButton title="Finalize Payroll" className="bg-blue-600 hover:bg-blue-700 text-white" />
            </form>
          )}
          {isFinalized && (
            <DisburseDialog runId={run.id} accounts={bankAccounts} totalGross={formatCurrency(totalGross)} />
          )}
          {isPaid && (
            <Button disabled variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 opacity-100">
              <CheckCircle2 size={16} className="mr-2" /> Ledger Closed
            </Button>
          )}
        </div>
      </div>

      {isDraft && !is13thMonth && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Draft Mode Active</h4>
            <p className="text-xs text-amber-700 mt-1">
              Gross pay and statutory deductions have been auto-calculated. You may adjust hours worked or commissions before finalizing.
            </p>
          </div>
        </div>
      )}

      {isDraft && is13thMonth && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-indigo-900">13th Month Pay Mode</h4>
            <p className="text-xs text-indigo-700 mt-1">
              Pay is prorated based on months worked this year. Per DOLE rules, this cycle is completely exempt from standard SSS, PhilHealth, Pag-IBIG, and Withholding Tax deductions.
            </p>
          </div>
        </div>
      )}

      <Card className="shadow-sm border-neutral-200 overflow-hidden">
        <form action={async (formData) => { "use server"; await saveDraftPayslips(formData); }}>
          <input type="hidden" name="run_id" value={run.id} />
          
          <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2"><Calculator size={18} className="text-neutral-500" /> Payslip Ledger</CardTitle>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Gross</p>
                <p className="text-lg font-bold text-neutral-900">{formatCurrency(totalGross)}</p>
              </div>
              <div className="pl-6 border-l border-neutral-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Net Payout</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalNet)}</p>
              </div>
            </div>
          </CardHeader>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
              <thead className="bg-white border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Employee</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Base Inputs (Hrs/Comm)</th>
                  <th className="px-6 py-4 font-semibold text-amber-600">Overtime (Hrs)</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Gross Pay</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Deductions</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {(payslips || []).map((slip) => {
                  const emp = slip.employees as any;
                  const bk = slip.breakdown as any || { sss: 0, phic: 0, hdmf: 0, tax: 0, ot_pay: 0 };
                  const hasZeroCompliance = !emp.sss_enabled && !emp.philhealth_enabled && !emp.pagibig_enabled && !emp.tax_enabled;

                  return (
                    <tr key={slip.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-neutral-900">{emp.first_name} {emp.last_name}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Base: {formatCurrency(Number(emp.base_rate))} • {emp.pay_type.replace('_', ' ')}</p>
                      </td>

                      <td className="px-6 py-4">
                        {isDraft && !is13thMonth ? (
                          emp.pay_type === 'HOURLY' ? (
                            <div className="flex items-center gap-2"><Input type="number" step="0.5" name={`hours_worked_${slip.id}`} defaultValue={slip.hours_worked} className="w-20 h-8 text-xs" /><span className="text-[10px] text-neutral-500">hrs</span></div>
                          ) : emp.pay_type === 'COMMISSION' ? (
                            <div className="flex items-center gap-2"><span className="text-[10px] text-neutral-500">₱</span><Input type="number" step="0.01" name={`commission_earned_${slip.id}`} defaultValue={slip.commission_earned} className="w-24 h-8 text-xs" /></div>
                          ) : (<span className="text-[10px] text-neutral-400 italic">Auto Base</span>)
                        ) : (
                          <div className="text-xs font-medium text-neutral-700">{is13thMonth ? '13th Month Pay' : emp.pay_type === 'HOURLY' ? `${slip.hours_worked} hrs` : emp.pay_type === 'COMMISSION' ? formatCurrency(Number(slip.commission_earned)) : '-'}</div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {isDraft && !is13thMonth ? (
                          <div className="flex items-center gap-2">
                            <Input type="number" step="0.5" name={`overtime_hours_${slip.id}`} defaultValue={slip.overtime_hours} className="w-20 h-8 bg-amber-50/50 border-amber-200 text-xs focus-visible:ring-amber-500" />
                            <span className="text-[10px] text-amber-700 font-medium">hrs (+25%)</span>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-neutral-700">{is13thMonth ? '-' : `${slip.overtime_hours || 0} hrs`}</div>
                        )}
                        {bk.ot_pay > 0 && <span className="text-[9px] text-emerald-600 block mt-1 font-bold">+ {formatCurrency(bk.ot_pay)}</span>}
                      </td>

                      <td className="px-6 py-4 text-right"><p className="font-bold text-neutral-900">{formatCurrency(Number(slip.gross_pay))}</p></td>

                      <td className="px-6 py-4">
                        {is13thMonth ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-500 italic"><ShieldOff size={10} /> Exempt by DOLE</span>
                        ) : hasZeroCompliance || Number(slip.gross_pay) === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-400 italic"><ShieldOff size={10} /> No deductions</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {emp.sss_enabled && bk.sss > 0 && <span className="text-[10px] text-rose-600 font-medium">SSS: -{formatCurrency(bk.sss)}</span>}
                            {emp.philhealth_enabled && bk.phic > 0 && <span className="text-[10px] text-rose-600 font-medium">PHIC: -{formatCurrency(bk.phic)}</span>}
                            {emp.pagibig_enabled && bk.hdmf > 0 && <span className="text-[10px] text-rose-600 font-medium">HDMF: -{formatCurrency(bk.hdmf)}</span>}
                            {emp.tax_enabled && bk.tax > 0 && <span className="text-[10px] text-purple-700 font-bold border-t border-rose-100 pt-0.5 mt-0.5">TAX: -{formatCurrency(bk.tax)}</span>}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right"><p className="font-bold text-emerald-600 text-base">{formatCurrency(Number(slip.net_pay))}</p></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {isDraft && !is13thMonth && (
            <div className="bg-neutral-50/50 border-t border-neutral-100 p-4 flex justify-end">
              <SubmitButton title="Save & Recalculate Totals" className="bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm" />
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}