// src/app/(dashboard)/reports/cash-flow/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { DashboardFilter } from "@/app/(dashboard)/dashboard/DashboardFilter";
import { ArrowLeft } from "lucide-react";
import PrintReportButton from "../components/PrintReportButton"; // Reusing our 1-click print button!

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CashFlowPage(props: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(business_name, currency)")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const businessName = bizData?.business_name || "Company Name";
  const currency = bizData?.currency || "PHP";

  // 1. FETCH RAW CASH DATA (Grouping by the Physical Bank Account / Asset Account)
  // Notice we use income_account_id_fkey instead of category!
  const { data: incomeData } = await supabase.from("income").select("amount, date, accounts!income_account_id_fkey(name)").eq("business_id", businessId);
  const { data: expenseData } = await supabase.from("expenses").select("amount, date, accounts!expenses_account_id_fkey(name)").eq("business_id", businessId);

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

  // 3. THE CASH FLOW ACCUMULATOR
  let totalCashIn = 0;
  let totalCashOut = 0;
  
  const cashInflows: Record<string, number> = {};
  const cashOutflows: Record<string, number> = {};

  (incomeData || []).forEach((inc) => {
    if (isInPeriod(inc.date)) {
      const amt = Number(inc.amount);
      totalCashIn += amt;
      const accountName = (inc.accounts as any)?.name || "Uncategorized Bank Account";
      cashInflows[accountName] = (cashInflows[accountName] || 0) + amt;
    }
  });

  (expenseData || []).forEach((exp) => {
    if (isInPeriod(exp.date)) {
      const amt = Number(exp.amount);
      totalCashOut += amt;
      const accountName = (exp.accounts as any)?.name || "Uncategorized Bank Account";
      cashOutflows[accountName] = (cashOutflows[accountName] || 0) + amt;
    }
  });

  const netCashFlow = totalCashIn - totalCashOut;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-12 print:p-0 print:m-0 print:space-y-0 print:block print:max-w-none">
      
      {/* HEADER & CONTROLS (Hidden during print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <button className="flex items-center justify-center h-10 w-10 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-full shrink-0 transition-colors">
              <ArrowLeft size={16} className="text-neutral-600" />
            </button>
          </Link>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">Cash Flow</h2>
            <p className="text-sm text-neutral-500 mt-1">Liquidity & Bank Summary</p>
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
          
          {/* DOCUMENT HEADER */}
          <div className="bg-neutral-50 border-b border-neutral-200 p-8 text-center print:bg-white print:border-neutral-900 print:border-b-2">
            <h1 className="text-xl font-black uppercase tracking-widest text-neutral-900">{businessName}</h1>
            <h2 className="text-base font-bold text-neutral-500 mt-1 print:text-neutral-900">STATEMENT OF CASH FLOWS</h2>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider print:text-neutral-600">For the period: {periodLabel}</p>
          </div>

          <div className="p-8 md:p-12 space-y-8 text-sm">
            
            {/* CASH INFLOWS SECTION */}
            <div>
              <h3 className="font-bold text-emerald-700 print:text-neutral-900 uppercase tracking-wider border-b border-emerald-100 print:border-neutral-200 pb-2 mb-4">1. Cash Inflows (Received)</h3>
              <div className="space-y-3 pl-4">
                {Object.entries(cashInflows).length === 0 ? (
                  <div className="flex justify-between text-neutral-500 italic"><span>No cash received</span><span>{formatCurrency(0)}</span></div>
                ) : (
                  Object.entries(cashInflows).map(([account, amount]) => (
                    <div key={account} className="flex justify-between text-neutral-700 print:text-neutral-900">
                      <span>Deposited to: <strong className="font-medium">{account}</strong></span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between font-bold text-neutral-900 mt-4 pt-3 border-t border-neutral-100">
                <span>Total Cash In</span>
                <span className="text-emerald-600 print:text-neutral-900">{formatCurrency(totalCashIn)}</span>
              </div>
            </div>

            {/* CASH OUTFLOWS SECTION */}
            <div>
              <h3 className="font-bold text-rose-700 print:text-neutral-900 uppercase tracking-wider border-b border-rose-100 print:border-neutral-200 pb-2 mb-4">2. Cash Outflows (Spent)</h3>
              <div className="space-y-3 pl-4">
                {Object.entries(cashOutflows).length === 0 ? (
                  <div className="flex justify-between text-neutral-500 italic"><span>No cash spent</span><span>{formatCurrency(0)}</span></div>
                ) : (
                  Object.entries(cashOutflows).map(([account, amount]) => (
                    <div key={account} className="flex justify-between text-neutral-700 print:text-neutral-900">
                      <span>Paid from: <strong className="font-medium">{account}</strong></span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between font-bold text-neutral-900 mt-4 pt-3 border-t border-neutral-100">
                <span>Total Cash Out</span>
                <span className="text-rose-600 print:text-neutral-900">{formatCurrency(totalCashOut)}</span>
              </div>
            </div>

            {/* NET CASH FLOW SUMMARY */}
            <div className="mt-8 pt-6 border-t-2 border-neutral-900">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-black text-neutral-900 uppercase tracking-widest text-lg">Net Cash Flow</span>
                  <p className="text-xs text-neutral-500 mt-1">Total Cash In less Total Cash Out</p>
                </div>
                <span className={`font-black text-3xl ${netCashFlow < 0 ? 'text-rose-600 print:text-neutral-900' : 'text-neutral-900'}`}>
                  {netCashFlow < 0 ? `(${formatCurrency(Math.abs(netCashFlow))})` : formatCurrency(netCashFlow)}
                </span>
              </div>
            </div>

            {/* PRINT FOOTER */}
            <div className="hidden print:flex mt-24 pt-8 border-t border-neutral-200 text-xs text-neutral-400 justify-between uppercase tracking-wider font-medium">
              <span>Generated: {new Date().toLocaleString()}</span>
              <span>MacroBiz Financial Systems</span>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}