// src/app/(dashboard)/payroll/[id]/print/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PrintActions from "./PrintActions";

// NOTE: We do not use the standard layout wrapper here because we need a blank canvas for printing!

export default async function PrintPayslipsPage(props: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ search?: string }>
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const runId = params.id;
  const searchStr = searchParams?.search?.toLowerCase() || '';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id, businesses(business_name, address, currency)").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  const bizData = profile?.businesses as any;
  const businessName = Array.isArray(bizData) ? bizData[0]?.business_name : bizData?.business_name || "Company Name";
  const address = Array.isArray(bizData) ? bizData[0]?.address : bizData?.address || "";
  const currency = Array.isArray(bizData) ? bizData[0]?.currency : bizData?.currency || "PHP";

  const { data: run } = await supabase.from("payroll_runs").select("*").eq("id", runId).eq("business_id", businessId).single();
  if (!run) redirect("/payroll");

  const { data: payslips } = await supabase
    .from("payslips")
    .select(`id, hours_worked, overtime_hours, commission_earned, gross_pay, net_pay, breakdown, employees!inner ( first_name, last_name, position, pay_type, base_rate )`)
    .eq("payroll_run_id", runId)
    .order("employees(first_name)", { ascending: true });

  // THE FIX: IN-MEMORY SEARCH FILTERING
  let filteredPayslips = payslips || [];
  if (searchStr) {
    filteredPayslips = filteredPayslips.filter((slip) => {
      const emp = slip.employees as any;
      const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const position = (emp.position || '').toLowerCase();
      return fullName.includes(searchStr) || position.includes(searchStr);
    });
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  
  const is13thMonth = run.run_type === '13TH_MONTH';
  const periodText = is13thMonth 
    ? `13th Month Pay (${new Date(run.period_start).getFullYear()})` 
    : `${new Date(run.period_start).toLocaleDateString()} - ${new Date(run.period_end).toLocaleDateString()}`;

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white font-sans text-neutral-900 relative">
      
      {/* Passed the Search String down to the Toolbar so it stays in the input box! */}
      <PrintActions runId={runId} searchStr={searchParams?.search || ''} />

      {/* Added pt-24 because our new Toolbar is fixed at the top */}
      <div id="payslip-canvas" className="mx-auto max-w-3xl pt-24 print:pt-0 pb-12 print:pb-0">
        
        {/* EMPTY STATE IF NO ONE MATCHES THE SEARCH */}
        {filteredPayslips.length === 0 ? (
          <div className="text-center text-neutral-500 pt-12 print:hidden">
            No employees found matching "{searchParams?.search}".
          </div>
        ) : (
          filteredPayslips.map((slip, index) => {
            const emp = slip.employees as any;
            const bk = slip.breakdown as any || { sss: 0, phic: 0, hdmf: 0, tax: 0, ot_pay: 0 };
            const totalDeductions = bk.sss + bk.phic + bk.hdmf + bk.tax;

            return (
              <div key={slip.id} className="bg-white p-8 md:p-12 print:p-0 print:shadow-none mb-8 shadow-sm border border-neutral-200 print:border-none print:break-after-page">
                
                {/* PAYSLIP HEADER */}
                <div className="border-b-2 border-neutral-900 pb-6 mb-6 flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-neutral-900">{businessName}</h1>
                    {address && <p className="text-xs text-neutral-500 mt-1">{address}</p>}
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold uppercase tracking-wider text-neutral-300">Payslip</h2>
                    <p className="text-xs font-bold text-neutral-900 mt-1">{periodText}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Payout Date: {new Date(run.run_date).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* EMPLOYEE INFO */}
                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 mb-8 flex justify-between print:bg-transparent print:border-neutral-900 print:rounded-none">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Employee Name</p>
                    <p className="text-base font-bold text-neutral-900">{emp.first_name} {emp.last_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Position</p>
                    <p className="text-sm font-medium text-neutral-900">{emp.position}</p>
                  </div>
                </div>

                {/* EARNINGS & DEDUCTIONS GRID */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  
                  {/* EARNINGS */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2 mb-3">Earnings</h3>
                    <div className="space-y-2 text-sm">
                      {is13thMonth ? (
                        <div className="flex justify-between"><span className="text-neutral-600">Prorated 13th Month</span><span className="font-medium">{formatCurrency(Number(slip.gross_pay))}</span></div>
                      ) : (
                        <>
                          <div className="flex justify-between"><span className="text-neutral-600">Basic Pay</span><span className="font-medium">{formatCurrency(Number(slip.gross_pay) - bk.ot_pay)}</span></div>
                          {bk.ot_pay > 0 && <div className="flex justify-between"><span className="text-neutral-600">Overtime Premium</span><span className="font-medium">{formatCurrency(bk.ot_pay)}</span></div>}
                        </>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-sm mt-4 pt-3 border-t border-neutral-200">
                      <span>Total Gross</span><span>{formatCurrency(Number(slip.gross_pay))}</span>
                    </div>
                  </div>

                  {/* DEDUCTIONS */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 border-b border-neutral-200 pb-2 mb-3">Deductions</h3>
                    <div className="space-y-2 text-sm">
                      {is13thMonth ? (
                        <div className="text-neutral-400 italic text-[11px]">Exempt from statutory deductions.</div>
                      ) : totalDeductions === 0 ? (
                        <div className="text-neutral-400 italic text-[11px]">No deductions applied.</div>
                      ) : (
                        <>
                          {bk.sss > 0 && <div className="flex justify-between"><span className="text-neutral-600">SSS Contribution</span><span className="font-medium text-rose-600">-{formatCurrency(bk.sss)}</span></div>}
                          {bk.phic > 0 && <div className="flex justify-between"><span className="text-neutral-600">PhilHealth</span><span className="font-medium text-rose-600">-{formatCurrency(bk.phic)}</span></div>}
                          {bk.hdmf > 0 && <div className="flex justify-between"><span className="text-neutral-600">Pag-IBIG</span><span className="font-medium text-rose-600">-{formatCurrency(bk.hdmf)}</span></div>}
                          {bk.tax > 0 && <div className="flex justify-between"><span className="text-neutral-600">Withholding Tax</span><span className="font-medium text-rose-600">-{formatCurrency(bk.tax)}</span></div>}
                        </>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-sm mt-4 pt-3 border-t border-neutral-200">
                      <span>Total Deductions</span><span className="text-rose-600">-{formatCurrency(totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                {/* NET PAY SUMMARY */}
                <div className="bg-neutral-900 text-white p-6 rounded-xl flex items-center justify-between print:border-4 print:border-neutral-900 print:bg-white print:text-neutral-900 print:rounded-none">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 print:text-neutral-500">Net Take Home Pay</p>
                    <p className="text-[10px] text-neutral-500 print:text-neutral-500 mt-1">Total amount credited to employee.</p>
                  </div>
                  <div className="text-3xl font-black">{formatCurrency(Number(slip.net_pay))}</div>
                </div>

                {/* SIGNATURES */}
                <div className="grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-neutral-200 print:border-neutral-900">
                  <div>
                    <div className="border-b border-neutral-300 w-full mb-2"></div>
                    <p className="text-[10px] uppercase font-bold text-neutral-400 text-center">Employer Signature</p>
                  </div>
                  <div>
                    <div className="border-b border-neutral-300 w-full mb-2"></div>
                    <p className="text-[10px] uppercase font-bold text-neutral-400 text-center">Employee Signature</p>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}