// src/app/(dashboard)/reports/taxes/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { DashboardFilter } from "@/app/(dashboard)/dashboard/DashboardFilter";
import { ArrowLeft } from "lucide-react";
import PrintReportButton from "../components/PrintReportButton";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TaxReportPage(props: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(business_name, currency, is_tax_registered, tax_id)")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const businessName = bizData?.business_name || "Company Name";
  const currency = bizData?.currency || "PHP";
  const isTaxRegistered = bizData?.is_tax_registered || false;
  const taxId = bizData?.tax_id || "Unregistered";

  // 1. FETCH INCOME & TAX EXPENSES ONLY
  const { data: incomeData } = await supabase.from("income").select("amount, date").eq("business_id", businessId);
  const { data: expenseData } = await supabase.from("expenses").select("amount, date, description, accounts!expenses_category_id_fkey(name)").eq("business_id", businessId);

  // 2. THE TEMPORAL ENGINE
  const now = new Date();
  const selectedMonth = params.month === 'all' ? 'all' : parseInt(params.month || String(now.getMonth() + 1));
  const selectedYear = parseInt(params.year || String(now.getFullYear()));

  const isInPeriod = (dateString: string) => {
    if (!dateString) return false;
    const itemYear = dateString.substring(0, 4);
    const itemMonth = dateString.substring(5, 7);
    if (selectedMonth === 'all') return itemYear === String(selectedYear); 
    const targetMonth = String(selectedMonth).padStart(2, '0');
    return itemYear === String(selectedYear) && itemMonth === targetMonth; 
  };

  const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const periodLabel = selectedMonth === 'all' ? `Fiscal Year ${selectedYear}` : `${monthNames[selectedMonth as number]} ${selectedYear}`;

  // 3. THE COMPLIANCE ACCUMULATOR
  let periodGrossRevenue = 0;
  let periodTaxesPaid = 0;
  const taxTransactions: any[] = [];

  (incomeData || []).forEach((inc) => {
    if (isInPeriod(inc.date)) periodGrossRevenue += Number(inc.amount);
  });

  (expenseData || []).forEach((exp) => {
    if (isInPeriod(exp.date)) {
      const accountName = (exp.accounts as any)?.name || "";
      // If the expense hit a Tax/License account, flag it!
      if (accountName.toLowerCase().includes("tax") || accountName.toLowerCase().includes("license")) {
        const amt = Number(exp.amount);
        periodTaxesPaid += amt;
        taxTransactions.push({ date: exp.date, description: exp.description || "Tax/Fee Payment", amount: amt });
      }
    }
  });

  // Calculate generic VAT estimate (Usually 12% in PH, derived from Gross Sales if inclusive)
  const estimatedVatOutput = isTaxRegistered ? (periodGrossRevenue / 1.12) * 0.12 : 0;
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-12 print:p-0 print:m-0 print:space-y-0 print:block print:max-w-none">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <button className="flex items-center justify-center h-10 w-10 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-full shrink-0 transition-colors">
              <ArrowLeft size={16} className="text-neutral-600" />
            </button>
          </Link>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">Tax & Compliance</h2>
            <p className="text-sm text-neutral-500 mt-1">Regulatory filing summary</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <DashboardFilter />
          <PrintReportButton />
        </div>
      </div>

      {/* THE FINANCIAL STATEMENT DOCUMENT */}
      <Card className="shadow-sm border-neutral-200 bg-white overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <CardContent className="p-0">
          
          <div className="bg-neutral-50 border-b border-neutral-200 p-8 text-center print:bg-white print:border-neutral-900 print:border-b-2">
            <h1 className="text-xl font-black uppercase tracking-widest text-neutral-900">{businessName}</h1>
            <h2 className="text-base font-bold text-neutral-500 mt-1 print:text-neutral-900">TAX & COMPLIANCE SUMMARY</h2>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider print:text-neutral-600">For the period: {periodLabel}</p>
          </div>

          <div className="p-8 md:p-12 space-y-8 text-sm">
            
            {/* COMPLIANCE STATUS */}
            <div className="flex items-center gap-4 bg-neutral-50 border border-neutral-200 p-4 rounded-lg print:border-neutral-300">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Filing Status</p>
                <p className={`font-bold text-lg ${isTaxRegistered ? 'text-emerald-700 print:text-neutral-900' : 'text-neutral-600'}`}>
                  {isTaxRegistered ? 'Registered Corporate Entity' : 'Unregistered / Exempt'}
                </p>
              </div>
              <div className="flex-1 border-l border-neutral-200 pl-4">
                <p className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Tax Identification No.</p>
                <p className="font-bold text-lg text-neutral-900">{taxId}</p>
              </div>
            </div>

            {/* REVENUE DECLARATION */}
            <div>
              <h3 className="font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-4">1. Gross Revenue Declaration</h3>
              <div className="flex justify-between items-center text-neutral-700 print:text-neutral-900 pl-4">
                <span>Total Gross Receipts (Subject to Tax)</span>
                <span className="font-bold text-lg">{formatCurrency(periodGrossRevenue)}</span>
              </div>
              {isTaxRegistered && (
                <div className="flex justify-between items-center text-neutral-500 pl-4 mt-2">
                  <span>↳ Estimated Output VAT (12% Inclusive)</span>
                  <span>{formatCurrency(estimatedVatOutput)}</span>
                </div>
              )}
            </div>

            {/* TAXES PAID */}
            <div>
              <h3 className="font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-4">2. Deductible Taxes, Licenses & Fees Paid</h3>
              <table className="w-full text-left pl-4">
                <thead className="text-[10px] uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {taxTransactions.length === 0 ? (
                    <tr><td colSpan={3} className="py-4 text-neutral-400 italic">No tax expenses recorded in this period.</td></tr>
                  ) : (
                    taxTransactions.map((tx, idx) => (
                      <tr key={idx} className="text-neutral-700 print:text-neutral-900">
                        <td className="py-2.5">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="py-2.5">{tx.description}</td>
                        <td className="py-2.5 text-right font-medium">{formatCurrency(tx.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* NET TAX COMPLIANCE SUMMARY */}
            <div className="mt-8 pt-6 border-t-2 border-neutral-900">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-black text-neutral-900 uppercase tracking-widest text-lg">Total Taxes Remitted</span>
                  <p className="text-xs text-neutral-500 mt-1">Sum of all compliance expenses for the period.</p>
                </div>
                <span className="font-black text-3xl text-rose-600 print:text-neutral-900">
                  {formatCurrency(periodTaxesPaid)}
                </span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}