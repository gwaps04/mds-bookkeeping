// src/app/(dashboard)/payslip/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PayslipActions from "./PayslipActions"; // <-- This looks for the file we just verified above!

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function IsolatedPayslipPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(business_name, address, currency)")
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const businessName = bizData?.business_name || "Business";
  const currency = bizData?.currency || "PHP";
  const address = bizData?.address || "";

  // FETCH ONLY THIS SPECIFIC PAYSLIP
  const { data: payslip } = await supabase
    .from("payslips")
    .select(`
      *,
      employees (first_name, last_name, position, pay_type, base_rate),
      payroll_runs (id, period_start, period_end, run_date, run_type)
    `)
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!payslip) {
    return <div className="p-12 text-center text-neutral-500">Payslip record not found or access denied.</div>;
  }

  const employee = payslip.employees as any;
  const run = payslip.payroll_runs as any;
  const breakdown = payslip.breakdown as any || {};

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:m-0 animate-in fade-in duration-500">
      
      {/* THE CLIENT ACTIONS (Hidden during print) */}
      <PayslipActions runId={run.id} />

      {/* THE A4 PAYSLIP DOCUMENT */}
      <div className="bg-white p-8 sm:p-12 border border-neutral-200 rounded-xl shadow-sm print:border-none print:shadow-none print:p-0 print:w-full">
        
        {/* DOCUMENT HEADER */}
        <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-neutral-900">{businessName}</h1>
            {address && <p className="text-sm text-neutral-500 mt-1 max-w-xs">{address}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-indigo-900 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded inline-block">Payslip</h2>
            <p className="text-sm font-medium text-neutral-500 mt-3">Date: {new Date(run.run_date).toLocaleDateString()}</p>
            <p className="text-xs text-neutral-400 mt-1">Ref: {payslip.id.split('-')[0].toUpperCase()}</p>
          </div>
        </div>

        {/* EMPLOYEE & PERIOD DETAILS */}
        <div className="grid grid-cols-2 gap-8 mb-10 p-6 bg-neutral-50 rounded-lg border border-neutral-100 print:bg-white print:border-neutral-300">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Employee Information</p>
            <p className="text-lg font-bold text-neutral-900">{employee.first_name} {employee.last_name}</p>
            <p className="text-sm text-neutral-600 mt-0.5">{employee.position || 'Staff'}</p>
            <p className="text-xs text-neutral-500 mt-1 font-mono uppercase">Type: {employee.pay_type.replace('_', ' ')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Pay Period</p>
            <p className="text-base font-bold text-neutral-900">
              {new Date(run.period_start).toLocaleDateString()} — {new Date(run.period_end).toLocaleDateString()}
            </p>
            <p className="text-sm text-neutral-600 mt-1 uppercase tracking-wider text-[11px] font-bold">
              Cycle: {run.run_type.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* EARNINGS & DEDUCTIONS TABLES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          
          {/* EARNINGS */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-4">Earnings</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-neutral-700">
                <span>Basic Pay</span>
                <span>{formatCurrency(Number(breakdown.base_earnings || 0))}</span>
              </div>
              {Number(payslip.overtime_hours) > 0 && (
                <div className="flex justify-between text-neutral-700">
                  <span>Overtime Pay ({payslip.overtime_hours} hrs)</span>
                  <span>{formatCurrency(Number(breakdown.overtime_pay || 0))}</span>
                </div>
              )}
              {Number(payslip.commission_earned) > 0 && (
                <div className="flex justify-between text-neutral-700">
                  <span>Commissions / Bonus</span>
                  <span>{formatCurrency(Number(payslip.commission_earned))}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-6 pt-3 border-t border-neutral-200 font-bold">
              <span className="text-neutral-900">Gross Earnings</span>
              <span className="text-neutral-900">{formatCurrency(Number(payslip.gross_pay))}</span>
            </div>
          </div>

          {/* DEDUCTIONS */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-4">Deductions</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-neutral-700">
                <span>SSS Contribution</span>
                <span className="text-rose-600">-{formatCurrency(Number(breakdown.sss_deduction || 0))}</span>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>PhilHealth Contribution</span>
                <span className="text-rose-600">-{formatCurrency(Number(breakdown.phic_deduction || 0))}</span>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>Pag-IBIG Contribution</span>
                <span className="text-rose-600">-{formatCurrency(Number(breakdown.hdmf_deduction || 0))}</span>
              </div>
              {Number(breakdown.tax_deduction) > 0 && (
                <div className="flex justify-between text-neutral-700">
                  <span>Withholding Tax</span>
                  <span className="text-rose-600">-{formatCurrency(Number(breakdown.tax_deduction || 0))}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-6 pt-3 border-t border-neutral-200 font-bold">
              <span className="text-neutral-900">Total Deductions</span>
              <span className="text-rose-600">
                -{formatCurrency(Number(breakdown.sss_deduction || 0) + Number(breakdown.phic_deduction || 0) + Number(breakdown.hdmf_deduction || 0) + Number(breakdown.tax_deduction || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* NET PAY SUMMARY */}
        <div className="flex items-center justify-between bg-indigo-900 text-white p-6 rounded-xl print:bg-white print:text-neutral-900 print:border-y-2 print:border-neutral-900 print:rounded-none">
          <div>
            <span className="block text-xs uppercase tracking-widest font-bold text-indigo-200 print:text-neutral-500 mb-1">Take Home Pay</span>
            <span className="block text-3xl font-black">{formatCurrency(Number(payslip.net_pay))}</span>
          </div>
          <div className="text-right">
             <p className="text-xs text-indigo-200 print:text-neutral-500 max-w-[200px] leading-relaxed">This is a system-generated document. No signature is required.</p>
          </div>
        </div>

      </div>
    </div>
  );
}