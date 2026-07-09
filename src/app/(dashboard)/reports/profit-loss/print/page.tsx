// src/app/(dashboard)/reports/profit-loss/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { DashboardFilter } from "@/app/(dashboard)/dashboard/DashboardFilter";
import { Printer, ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProfitAndLossPage(props: { searchParams: Promise<{ month?: string, year?: string }> }) {
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

  // 1. FETCH RAW DATA
  const { data: incomeData } = await supabase.from("income").select("amount, date, description").eq("business_id", businessId);
  const { data: expenseData } = await supabase.from("expenses").select("amount, date, accounts!expenses_category_id_fkey(name)").eq("business_id", businessId);
  const { data: cogsData } = await supabase
    .from("stock_movements")
    .select("quantity, created_at, items!inner(unit_cost)")
    .eq("business_id", businessId)
    .eq("type", "STOCK_OUT")
    .in("reference_type", ["INVOICE", "RECIPE_DEDUCTION"]);

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

  // 3. THE ACCOUNTING ACCUMULATOR
  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalOperatingExpenses = 0;
  
  const revenueGroups: Record<string, number> = {};
  const expenseGroups: Record<string, number> = {};

  (incomeData || []).forEach((inc) => {
    if (isInPeriod(inc.date)) {
      const amt = Number(inc.amount);
      totalRevenue += amt;
      const cat = inc.description?.toLowerCase().includes('invoice') ? 'B2B Invoice Payments' : 'General Sales / Revenue';
      revenueGroups[cat] = (revenueGroups[cat] || 0) + amt;
    }
  });

  (cogsData || []).forEach((mov) => {
    if (isInPeriod(mov.created_at)) {
      totalCOGS += (Number(mov.quantity) * Number((mov.items as any)?.unit_cost || 0));
    }
  });

  (expenseData || []).forEach((exp) => {
    if (isInPeriod(exp.date)) {
      const amt = Number(exp.amount);
      totalOperatingExpenses += amt;
      const cat = (exp.accounts as any)?.name || "Uncategorized Expense";
      expenseGroups[cat] = (expenseGroups[cat] || 0) + amt;
    }
  });

  const grossProfit = totalRevenue - totalCOGS;
  const netIncome = grossProfit - totalOperatingExpenses;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-12">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <button className="flex items-center justify-center h-10 w-10 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-full shrink-0 transition-colors">
              <ArrowLeft size={16} className="text-neutral-600" />
            </button>
          </Link>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">Profit & Loss</h2>
            <p className="text-sm text-neutral-500 mt-1">Income Statement</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <DashboardFilter />
          {/* THE FIX: Converted to a pure styled <a> tag so it perfectly triggers target="_blank" without nesting errors! */}
          <Link 
            href={`/reports/profit-loss/print?month=${selectedMonth}&year=${selectedYear}`} 
            target="_blank" 
            className="w-full sm:w-auto flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-11 sm:h-10 px-4 rounded-md font-semibold transition-colors"
          >
            <Printer size={16} className="mr-2" /> Print / PDF
          </Link>
        </div>
      </div>

      {/* THE FINANCIAL STATEMENT DOCUMENT */}
      <Card className="shadow-sm border-neutral-200 bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-neutral-50 border-b border-neutral-200 p-8 text-center">
            <h1 className="text-xl font-black uppercase tracking-widest text-neutral-900">{businessName}</h1>
            <h2 className="text-base font-bold text-neutral-500 mt-1">PROFIT AND LOSS STATEMENT</h2>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider">For the period: {periodLabel}</p>
          </div>

          <div className="p-8 md:p-12 space-y-8 text-sm">
            {/* REVENUE SECTION */}
            <div>
              <h3 className="font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-4">1. Operating Revenue</h3>
              <div className="space-y-3 pl-4">
                {Object.entries(revenueGroups).length === 0 ? (
                  <div className="flex justify-between text-neutral-500 italic"><span>No revenue recorded</span><span>{formatCurrency(0)}</span></div>
                ) : (
                  Object.entries(revenueGroups).map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-neutral-700">
                      <span>{category}</span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between font-bold text-neutral-900 mt-4 pt-3 border-t border-neutral-100">
                <span>Total Operating Revenue</span>
                <span>{formatCurrency(totalRevenue)}</span>
              </div>
            </div>

            {/* COST OF GOODS SOLD SECTION */}
            <div>
              <h3 className="font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-4">2. Cost of Goods Sold</h3>
              <div className="space-y-3 pl-4">
                <div className="flex justify-between text-neutral-700">
                  <span>Raw Materials & Inventory Consumed</span>
                  <span>{formatCurrency(totalCOGS)}</span>
                </div>
              </div>
              <div className="flex justify-between font-bold text-neutral-900 mt-4 pt-3 border-t border-neutral-100">
                <span>Total Cost of Goods Sold</span>
                <span>{formatCurrency(totalCOGS)}</span>
              </div>
            </div>

            {/* GROSS PROFIT */}
            <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
              <span className="font-black text-indigo-900 uppercase tracking-wider">Gross Profit</span>
              <span className="font-black text-lg text-indigo-700">{formatCurrency(grossProfit)}</span>
            </div>

            {/* OPERATING EXPENSES SECTION */}
            <div>
              <h3 className="font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-4">3. Operating Expenses</h3>
              <div className="space-y-3 pl-4">
                {Object.entries(expenseGroups).length === 0 ? (
                  <div className="flex justify-between text-neutral-500 italic"><span>No expenses recorded</span><span>{formatCurrency(0)}</span></div>
                ) : (
                  Object.entries(expenseGroups).map(([category, amount]) => (
                    <div key={category} className="flex justify-between text-neutral-700">
                      <span>{category}</span>
                      <span>{formatCurrency(amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between font-bold text-neutral-900 mt-4 pt-3 border-t border-neutral-100">
                <span>Total Operating Expenses</span>
                <span>{formatCurrency(totalOperatingExpenses)}</span>
              </div>
            </div>

            {/* NET INCOME SUMMARY */}
            <div className="mt-8 pt-6 border-t-2 border-neutral-900">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-black text-neutral-900 uppercase tracking-widest text-lg">Net Income</span>
                  <p className="text-xs text-neutral-500 mt-1">Gross Profit less Operating Expenses</p>
                </div>
                <span className={`font-black text-3xl ${netIncome < 0 ? 'text-rose-600' : 'text-neutral-900'}`}>
                  {formatCurrency(netIncome)}
                </span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}