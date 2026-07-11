// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reviewRefund } from "@/features/refunds/actions";
import Link from "next/link";
import { DashboardFilter } from "./DashboardFilter";
// THE FIX: Import the new Help Button!
import DashboardHelpButton from "./DashboardHelpButton"; 
import { Wallet, Receipt, CreditCard, Landmark, Banknote, TrendingUp, PackageMinus, Target, PackageX, ArrowRight, Info } from "lucide-react"; 

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ month?: string, year?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id, businesses(business_name, currency, is_tax_registered, show_net_cash_to_staff, show_taxes_to_staff, has_inventory_access)")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';
  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  
  const businessName = bizData?.business_name || "Business";
  const currency = bizData?.currency || "PHP";
  const isTaxEnabled = bizData?.is_tax_registered || false;
  const hasInventoryAccess = bizData?.has_inventory_access === true;

  const canSeeNetCash = isOwner || bizData?.show_net_cash_to_staff !== false;
  const canSeeTaxes = isTaxEnabled && (isOwner || bizData?.show_taxes_to_staff === true);

  const { data: incomeData } = await supabase
    .from("income")
    .select("id, amount, date, description, customers(name), accounts!income_category_id_fkey(type)")
    .eq("business_id", businessId);
    
  const { data: expenseData } = await supabase.from("expenses").select("id, amount, date, description, vendors(name), accounts!expenses_category_id_fkey(name)").eq("business_id", businessId);
  const { data: invoiceData } = await supabase.from("invoices").select("total_amount, status, income(amount)").eq("business_id", businessId);
  
  const { data: cogsData } = await supabase
    .from("stock_movements")
    .select("id, quantity, created_at, items!inner(unit_cost)")
    .eq("business_id", businessId)
    .eq("type", "STOCK_OUT")
    .in("reference_type", ["INVOICE", "RECIPE_DEDUCTION"]);

  let lowStockItems: any[] = [];
  if (hasInventoryAccess) {
    const { data: activeItems } = await supabase
      .from("items")
      .select("id, name, quantity_on_hand, reorder_threshold, unit_of_measure, type")
      .eq("business_id", businessId)
      .eq("is_archived", false);

    lowStockItems = (activeItems || []).filter(item => Number(item.quantity_on_hand) <= Number(item.reorder_threshold));
  }

  const { data: rawRefunds } = await supabase.from("refund_requests").select("id, amount, reason, created_at, requested_by").eq("business_id", businessId).eq("status", "pending");
  let pendingRefunds: any[] = rawRefunds || [];

  if (pendingRefunds.length > 0) {
    const userIds = pendingRefunds.map(r => r.requested_by);
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
    pendingRefunds = pendingRefunds.map(refund => {
      const prof = profiles?.find(p => p.id === refund.requested_by);
      return { ...refund, requester_name: prof?.full_name || 'Staff Member' };
    });
  }

  const now = new Date();
  const isDefaultState = !params.month && !params.year;
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

  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let periodLabel = "";
  if (isDefaultState) {
    periodLabel = "This Month (MTD)";
  } else if (selectedMonth === 'all') {
    periodLabel = `Year ${selectedYear}`;
  } else {
    periodLabel = `${monthNames[selectedMonth as number]} ${selectedYear}`;
  }

  let totalCashInAllTime = 0; 
  let totalExpensesAllTime = 0; 
  let periodRevenue = 0; 
  let periodCogs = 0; 
  let periodExpenses = 0; 
  let periodTransactions = 0; 
  let periodTaxesPaid = 0; 
  let unpaidInvoicesTotal = 0; 
  let unpaidInvoicesCount = 0;
  
  const recentActivity: any[] = [];

  (incomeData || []).forEach((inc) => {
    const amt = Number(inc.amount);
    const isEquity = (inc.accounts as any)?.type === 'equity';
    
    totalCashInAllTime += amt; 
    
    if (isInPeriod(inc.date)) {
      periodTransactions++;
      recentActivity.push({ 
        id: inc.id, 
        type: isEquity ? "equity" : "income", 
        amount: amt, 
        date: inc.date, 
        party: (inc.customers as any)?.name || (isEquity ? "Business Owner" : "Walk-in Customer"), 
        description: inc.description || (isEquity ? "Capital Injection" : "Cash Receipt") 
      });

      if (!isEquity) {
        periodRevenue += amt; 
      }
    }
  });

  (cogsData || []).forEach((mov) => {
    if (isInPeriod(mov.created_at)) {
      periodCogs += (Number(mov.quantity) * Number((mov.items as any)?.unit_cost || 0));
    }
  });

  (expenseData || []).forEach((exp) => {
    const amt = Number(exp.amount);
    totalExpensesAllTime += amt; 
    if (isInPeriod(exp.date)) {
      periodExpenses += amt; 
      periodTransactions++;
      if ((exp.accounts as any)?.name?.toLowerCase().includes("tax")) periodTaxesPaid += amt;
      recentActivity.push({ id: exp.id, type: "expense", amount: amt, date: exp.date, party: (exp.vendors as any)?.name || "System Record", description: exp.description || "Business Expense" });
    }
  });

  (invoiceData || []).forEach((inv) => {
    if (inv.status === 'sent') {
      const remainingBalance = Math.max(0, Number(inv.total_amount) - (inv.income as any[] || []).reduce((sum, p) => sum + Number(p.amount), 0));
      if (remainingBalance > 0) { unpaidInvoicesTotal += remainingBalance; unpaidInvoicesCount++; }
    }
  });

  const totalCashAllTime = totalCashInAllTime - totalExpensesAllTime; 
  const periodGrossProfit = periodRevenue - periodCogs; 
  const periodNetIncome = periodGrossProfit - periodExpenses; 
  
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const top5Activity = recentActivity.slice(0, 5);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* THE FIX: Added flex-wrap and placed the Help Button next to the Filter! */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="w-full lg:flex-1 pr-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">
            Hi, {businessName}.
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-neutral-500 mt-1">Welcome to your financial command center.</p>
        </div>
        <div className="w-full lg:w-auto shrink-0 flex flex-wrap items-center gap-3">
          <DashboardHelpButton />
          <DashboardFilter />
        </div>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-md shrink-0 mt-0.5">
            <Info size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-1.5">Quick Guide: Reading Your Dashboard</h3>
            <ul className="text-xs sm:text-sm text-blue-800 space-y-1.5 leading-relaxed list-disc list-inside ml-2">
              <li><strong>The Time Filter:</strong> Use the dropdowns in the top right to analyze specific months or your entire fiscal year. The metric cards will instantly calculate data for your chosen period.</li>
              <li><strong>Net Cash vs. Revenue:</strong> <em>Net Cash Balance</em> tracks your absolute Cash flow (all money in minus all money out). <em>Total Revenue</em> strictly tracks sales (it automatically hides personal Equity injections to protect your tax calculations).</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        
        {canSeeNetCash && (
          <Link href="/transactions" className="block group">
            <Card className="shadow-sm border-neutral-200 bg-white hover:border-emerald-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden flex flex-col justify-between p-0 sm:p-1">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-2 pt-4 px-4 md:px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Net Cash Balance</CardTitle>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md shrink-0"><Wallet size={16} /></div>
              </CardHeader>
              <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
                <div className={`text-2xl sm:text-3xl font-black tracking-tight break-words leading-none pb-1 ${totalCashAllTime < 0 ? 'text-red-600' : 'text-neutral-900'}`}>
                  {formatCurrency(totalCashAllTime)}
                </div>
                <p className="text-[9px] sm:text-[10px] text-neutral-400 mt-2 uppercase tracking-widest font-bold">ALL TIME</p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href={`/income?month=${selectedMonth}&year=${selectedYear}`} className="block group">
          <Card className="shadow-sm border-neutral-200 bg-white hover:border-emerald-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden flex flex-col justify-between p-0 sm:p-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-4 px-4 md:px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Total Revenue</CardTitle>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md shrink-0"><Banknote size={16} /></div>
            </CardHeader>
            <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
              <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight break-words leading-none pb-1">
                {formatCurrency(periodRevenue)}
              </div>
              <p className="text-[9px] sm:text-[10px] text-emerald-700 mt-2 font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-100 inline-block px-1.5 py-0.5 rounded break-words">
                {periodLabel}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/inventory?month=${selectedMonth}&year=${selectedYear}`} className="block group">
          <Card className="shadow-sm border-neutral-200 bg-white hover:border-amber-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden flex flex-col justify-between p-0 sm:p-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-4 px-4 md:px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Cost of Goods (COGS)</CardTitle>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md shrink-0"><PackageMinus size={16} /></div>
            </CardHeader>
            <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
              <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight break-words leading-none pb-1">
                {formatCurrency(periodCogs)}
              </div>
              <p className="text-[9px] sm:text-[10px] text-amber-700 mt-2 font-bold uppercase tracking-widest bg-amber-50 border border-amber-100 inline-block px-1.5 py-0.5 rounded break-words">
                {periodLabel}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/dashboard?month=${selectedMonth}&year=${selectedYear}`} className="block group">
          <Card className="shadow-sm border-neutral-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden flex flex-col justify-between p-0 sm:p-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-4 px-4 md:px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Gross Profit</CardTitle>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md shrink-0"><Target size={16} /></div>
            </CardHeader>
            <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
              <div className={`text-2xl sm:text-3xl font-black tracking-tight break-words leading-none pb-1 ${periodGrossProfit < 0 ? 'text-rose-600' : 'text-neutral-900'}`}>
                {formatCurrency(periodGrossProfit)}
              </div>
              <p className="text-[9px] sm:text-[10px] text-indigo-700 mt-2 font-bold uppercase tracking-widest bg-indigo-50 border border-indigo-100 inline-block px-1.5 py-0.5 rounded break-words">
                {periodLabel}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/expenses?month=${selectedMonth}&year=${selectedYear}`} className="block group">
          <Card className="shadow-sm border-neutral-200 bg-white hover:border-rose-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden flex flex-col justify-between p-0 sm:p-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-4 px-4 md:px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Operating Expenses</CardTitle>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-md shrink-0"><CreditCard size={16} /></div>
            </CardHeader>
            <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
              <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight break-words leading-none pb-1">
                {formatCurrency(periodExpenses)}
              </div>
              <p className="text-[9px] sm:text-[10px] text-rose-600 mt-2 font-bold uppercase tracking-widest bg-rose-50 border border-rose-100 inline-block px-1.5 py-0.5 rounded break-words">
                {periodLabel}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/transactions?month=${selectedMonth}&year=${selectedYear}`} className="block group">
          <Card className="shadow-sm border-neutral-200 bg-white hover:border-teal-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden flex flex-col justify-between p-0 sm:p-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-4 px-4 md:px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider">True Net Income</CardTitle>
              <div className="p-1.5 bg-teal-50 text-teal-600 rounded-md shrink-0"><TrendingUp size={16} /></div>
            </CardHeader>
            <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
              <div className={`text-2xl sm:text-3xl font-black tracking-tight break-words leading-none pb-1 ${periodNetIncome < 0 ? 'text-rose-600' : 'text-neutral-900'}`}>
                {formatCurrency(periodNetIncome)}
              </div>
              <p className="text-[9px] sm:text-[10px] text-teal-700 mt-2 font-bold uppercase tracking-widest bg-teal-50 border border-teal-100 inline-block px-1.5 py-0.5 rounded break-words">
                {periodLabel}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/invoices?status=unpaid" className="block group">
          <Card className="shadow-sm border-neutral-200 bg-white hover:border-blue-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden flex flex-col justify-between p-0 sm:p-1">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 pt-4 px-4 md:px-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Unpaid Invoices</CardTitle>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md shrink-0"><Receipt size={16} /></div>
            </CardHeader>
            <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
              <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight break-words leading-none pb-1">
                {formatCurrency(unpaidInvoicesTotal)}
              </div>
              <p className="text-[10px] sm:text-xs text-blue-600 font-medium mt-2 break-words">{unpaidInvoicesCount} invoice(s) pending</p>
            </CardContent>
          </Card>
        </Link>

        {canSeeTaxes && (
          <Link href={`/taxes?month=${selectedMonth}&year=${selectedYear}`} className="block group">
            <Card className="shadow-sm border-neutral-200 bg-white hover:border-orange-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden flex flex-col justify-between p-0 sm:p-1">
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-2 pt-4 px-4 md:px-5 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Taxes Paid</CardTitle>
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-md shrink-0"><Landmark size={16} /></div>
              </CardHeader>
              <CardContent className="px-4 md:px-5 pb-4 md:pb-5">
                <div className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight break-words leading-none pb-1">
                  {formatCurrency(periodTaxesPaid)}
                </div>
                <p className="text-[9px] sm:text-[10px] text-orange-600 mt-2 font-bold uppercase tracking-widest bg-orange-50 border border-orange-100 inline-block px-1.5 py-0.5 rounded break-words">
                  {periodLabel}
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {hasInventoryAccess && lowStockItems.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 md:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none transform translate-x-4 -translate-y-8">⚠️</div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-full bg-red-600 text-white text-base md:text-sm font-bold shadow-sm animate-pulse shrink-0">
                {lowStockItems.length}
              </span>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-red-900 tracking-tight">Low Stock Alerts</h3>
                <p className="text-xs md:text-sm text-red-700">The following items have fallen below their reorder threshold.</p>
              </div>
            </div>
            <Link href="/inventory" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-11 md:h-10 bg-white text-red-700 border-red-200 hover:bg-red-100 font-semibold">
                View Inventory <ArrowRight size={14} className="ml-2" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
            {lowStockItems.map((item) => (
              <div key={item.id} className="bg-white p-3 md:p-4 rounded-lg border border-red-100 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-red-50 text-red-600 rounded-md shrink-0 hidden sm:block"><PackageX size={16} /></div>
                  <div className="min-w-0">
                    <p className="font-bold text-neutral-900 text-sm truncate">{item.name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold truncate">{item.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-red-600 text-base">{Number(item.quantity_on_hand).toLocaleString()} <span className="text-[10px] font-normal text-neutral-500 uppercase tracking-widest">{item.unit_of_measure}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwner && pendingRefunds.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 md:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none transform translate-x-4 -translate-y-8">🔔</div>
          <div className="flex items-center gap-3 mb-5 relative z-10">
            <span className="flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-full bg-amber-600 text-white text-base md:text-sm font-bold shadow-sm shrink-0">{pendingRefunds.length}</span>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-amber-900 tracking-tight">Pending Approvals</h3>
              <p className="text-xs md:text-sm text-amber-700">Staff members have requested the following financial actions.</p>
            </div>
          </div>
          <div className="space-y-3 relative z-10">
            {pendingRefunds.map((refund) => (
              <div key={refund.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 md:p-5 rounded-lg border border-amber-100 shadow-sm gap-4 transition-all hover:border-amber-300">
                <div className="w-full min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-amber-100 text-amber-800 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">Refund Request</span>
                    <span className="text-[10px] md:text-xs text-neutral-400">{new Date(refund.created_at).toLocaleString()}</span>
                  </div>
                  <p className="font-bold text-neutral-900 text-xl md:text-lg break-words leading-none pb-1">{formatCurrency(Number(refund.amount))}</p>
                  <p className="text-sm text-neutral-600 mt-2 break-words">Requested by <span className="font-semibold text-neutral-900">{refund.requester_name}</span> • Reason: {refund.reason}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3 w-full md:w-auto shrink-0 mt-2 md:mt-0">
                  <form action={async () => { "use server"; await reviewRefund(refund.id, 'reject'); }} className="w-full sm:w-auto">
                    <Button type="submit" variant="outline" className="w-full sm:w-32 h-11 md:h-10 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-sm font-semibold">Reject</Button>
                  </form>
                  <form action={async () => { "use server"; await reviewRefund(refund.id, 'approve'); }} className="w-full sm:w-auto">
                    <Button type="submit" className="w-full sm:w-40 h-11 md:h-10 bg-amber-600 text-white hover:bg-amber-700 shadow-sm text-sm font-semibold">Approve & Deduct</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-4">Recent Activity ({periodLabel})</h3>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto scroll-smooth w-full">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead className="bg-neutral-50/80 border-b border-neutral-200">
                <tr>
                  <th className="px-5 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Date</th>
                  <th className="px-5 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Entity</th>
                  <th className="px-5 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[11px]">Description</th>
                  <th className="px-5 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[11px] text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {top5Activity.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-neutral-500">No activity logged for this period.</td></tr>
                ) : (
                  top5Activity.map((activity) => (
                    <tr key={`${activity.type}-${activity.id}`} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-5 py-4 text-neutral-500 font-medium">{new Date(activity.date).toLocaleDateString()}</td>
                      <td className="px-5 py-4 font-bold text-neutral-900">{activity.party}</td>
                      <td className="px-5 py-4 text-neutral-600">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] md:text-[11px] uppercase tracking-wider font-bold shadow-sm ${
                          activity.type === 'income' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                          activity.type === 'equity' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {activity.description.length > 35 ? activity.description.substring(0, 35) + '...' : activity.description}
                        </span>
                      </td>
                      <td className={`px-5 py-4 text-right font-black text-base ${
                        activity.type === 'income' ? 'text-emerald-600' : 
                        activity.type === 'equity' ? 'text-purple-600' : 
                        'text-rose-600'
                      }`}>
                        {activity.type === 'expense' ? '-' : '+'}{formatCurrency(activity.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}