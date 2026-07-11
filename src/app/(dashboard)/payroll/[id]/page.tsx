// src/app/(dashboard)/payroll/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Calculator, CheckCircle2, Clock, AlertCircle, Info, Users, Banknote, Receipt, FileText } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PayrollRunDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(currency)")
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // FETCH THE RUN AND ITS ASSOCIATED PAYSLIPS
  const { data: run } = await supabase
    .from("payroll_runs")
    .select(`
      *,
      payslips (
        id,
        gross_pay,
        net_pay,
        employees (first_name, last_name, position, pay_type)
      )
    `)
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!run) redirect("/payroll");

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  const payslips = run.payslips || [];
  const totalGross = payslips.reduce((sum: number, slip: any) => sum + Number(slip.gross_pay), 0);
  const totalNet = payslips.reduce((sum: number, slip: any) => sum + Number(slip.net_pay), 0);
  const totalDeductions = totalGross - totalNet;

  const StatusBadge = () => {
    if (run.status === 'DRAFT') return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200"><Clock size={14} /> Pending Review</span>;
    if (run.status === 'FINALIZED') return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200"><AlertCircle size={14} /> Awaiting Payout</span>;
    if (run.status === 'PAID') return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={14} /> Disbursed</span>;
    return null;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12">
      
      {/* HEADER & NAV */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link href="/payroll" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors mb-3">
            <ArrowLeft size={16} className="mr-1.5" /> Back to Payroll Hub
          </Link>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">Cycle Details</h2>
            <StatusBadge />
          </div>
          <p className="text-sm md:text-base text-neutral-500 mt-1">
            {new Date(run.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(run.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-md shrink-0 mt-0.5">
            <Info size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-1.5">Payslip Rendering Update</h3>
            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
              To prevent browser crashing and formatting errors during bulk PDF exports, payslips are now isolated. Click <strong className="font-bold text-blue-950">View Payslip</strong> next to any employee to open and download their perfectly formatted, A4-ready digital document.
            </p>
          </div>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-neutral-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-neutral-100 text-neutral-600 rounded-lg"><Users size={20} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Staff Processed</p>
              <p className="text-xl font-bold text-neutral-900">{payslips.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-neutral-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Calculator size={20} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Gross</p>
              <p className="text-xl font-bold text-neutral-900">{formatCurrency(totalGross)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-neutral-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><Receipt size={20} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Deductions</p>
              <p className="text-xl font-bold text-rose-600">-{formatCurrency(totalDeductions)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-neutral-200 bg-indigo-900 text-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-white/10 text-indigo-100 rounded-lg"><Banknote size={20} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Net Payout</p>
              <p className="text-xl font-bold text-white">{formatCurrency(totalNet)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* INDIVIDUAL PAYSLIPS LEDGER */}
      <Card className="shadow-sm border-neutral-200 overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4">
          <CardTitle className="text-lg flex items-center gap-2"><FileText size={18} className="text-neutral-500" /> Generated Payslips</CardTitle>
          <CardDescription>Individual compensation breakdowns for this cycle.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
            <thead className="bg-white border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-neutral-600">Employee</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Gross Pay</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Deductions</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Net Pay</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {payslips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">No payslips found in this run.</td>
                </tr>
              ) : (
                payslips.map((slip: any) => {
                  const emp = slip.employees;
                  const deductions = Number(slip.gross_pay) - Number(slip.net_pay);
                  
                  return (
                    <tr key={slip.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-neutral-900">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mt-0.5">{emp.position || 'Staff'}</p>
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-600 text-right">
                        {formatCurrency(Number(slip.gross_pay))}
                      </td>
                      <td className="px-6 py-4 font-bold text-rose-600 text-right">
                        -{formatCurrency(deductions)}
                      </td>
                      <td className="px-6 py-4 font-black text-indigo-700 text-right text-base">
                        {formatCurrency(Number(slip.net_pay))}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {/* THE FIX: Changed to SHALLOW ROUTING */}
                        <Link href={`/payslip/${slip.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm">
                            <ExternalLink size={14} className="mr-1.5" /> View Payslip
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}