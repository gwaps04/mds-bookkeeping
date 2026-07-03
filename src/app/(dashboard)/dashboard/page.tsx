// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reviewRefund } from "@/features/refunds/actions";
import Link from "next/link";
import { DashboardFilter } from "./DashboardFilter";
import { Wallet, Receipt, CreditCard, Activity, Landmark } from "lucide-react"; 

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage({ searchParams }: { searchParams: { month?: string, year?: string } }) {
  // Await the searchParams promise (Next.js 15+ requirement)
  const params = await searchParams;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch Profile & Permissions
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id, businesses(business_name, currency, is_tax_registered, show_net_cash_to_staff, show_taxes_to_staff)")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';
  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  
  const businessName = bizData?.business_name || "Business";
  const currency = bizData?.currency || "PHP";
  const isTaxEnabled = bizData?.is_tax_registered || false;

  const canSeeNetCash = isOwner || bizData?.show_net_cash_to_staff !== false;
  const canSeeTaxes = isTaxEnabled && (isOwner || bizData?.show_taxes_to_staff === true);

  // 2. Fetch Raw Data
  const { data: incomeData } = await supabase.from("income").select("id, amount, date, description, customers(name)").eq("business_id", businessId);
  const { data: expenseData } = await supabase.from("expenses").select("id, amount, date, description, vendors(name), accounts!expenses_category_id_fkey(name)").eq("business_id", businessId);
  const { data: invoiceData } = await supabase.from("invoices").select("total_amount, status, income(amount)").eq("business_id", businessId);
  
  // 3. Pending Refunds Engine
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

  // ============================================================================
  // 4. THE TIMEZONE-PROOF TEMPORAL ENGINE
  // ============================================================================
  const now = new Date();
  
  // A. Check if the user is in the default state
  const isDefaultState = !params.month && !params.year;

  // B. Parse the strict parameters
  const selectedMonth = params.month === 'all' ? 'all' : parseInt(params.month || String(now.getMonth() + 1));
  const selectedYear = parseInt(params.year || String(now.getFullYear()));

  // C. THE FIX: Absolute String Slicing boundary logic (Bypasses Server Timezone completely)
  const isInPeriod = (dateString: string) => {
    if (!dateString) return false;
    
    // Supabase dates arrive as "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss"
    // By slicing the absolute characters, we prevent Node.js from shifting the timezone
    const itemYear = dateString.substring(0, 4);
    const itemMonth = dateString.substring(5, 7);

    if (selectedMonth === 'all') {
      return itemYear === String(selectedYear); // Match full year only
    }
    
    // Ensure single-digit months (like "6") become "06" to match the database string
    const targetMonth = String(selectedMonth).padStart(2, '0');
    return itemYear === String(selectedYear) && itemMonth === targetMonth; 
  };

  // D. Label Generator
  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let periodLabel = "";
  if (isDefaultState) {
    periodLabel = "This Month (MTD)";
  } else if (selectedMonth === 'all') {
    periodLabel = `Year ${selectedYear}`;
  } else {
    periodLabel = `${monthNames[selectedMonth as number]} ${selectedYear}`;
  }

  // ============================================================================
  // 5. ACCUMULATOR ENGINE
  // ============================================================================
  let totalIncomeAllTime = 0; 
  let totalExpensesAllTime = 0; 
  
  let periodExpenses = 0; 
  let periodTransactions = 0; 
  let periodTaxesPaid = 0; 
  
  let unpaidInvoicesTotal = 0; 
  let unpaidInvoicesCount = 0;
  
  const recentActivity: any[] = [];

  (incomeData || []).forEach((inc) => {
    const amt = Number(inc.amount);
    totalIncomeAllTime += amt; 
    
    if (isInPeriod(inc.date)) {
      periodTransactions++;
      recentActivity.push({ id: inc.id, type: "income", amount: amt, date: inc.date, party: (inc.customers as any)?.name || "Walk-in Customer", description: inc.description || "Cash Receipt" });
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

  const totalCash = totalIncomeAllTime - totalExpensesAllTime;
  
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const top5Activity = recentActivity.slice(0, 5);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* HEADER WITH DUAL CLIENT FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 truncate max-w-[300px] md:max-w-[600px]">
            Hi, {businessName}.
          </h2>
          <p className="text-sm md:text-base text-neutral-500 mt-1">Welcome to your financial command center.</p>
        </div>
        <DashboardFilter />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
        
        {/* POINT-IN-TIME: Net Cash */}
        {canSeeNetCash && (
          <Link href="/transactions" className="block group">
            <Card className="shadow-sm border-neutral-200 bg-white hover:border-emerald-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider truncate mr-2">Net Cash Balance</CardTitle>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md shrink-0"><Wallet size={16} /></div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl md:text-3xl font-bold tracking-tight truncate ${totalCash < 0 ? 'text-red-600' : 'text-neutral-900'}`} title={formatCurrency(totalCash)}>
                  {formatCurrency(totalCash)}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-widest font-medium">All Time</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* POINT-IN-TIME: Unpaid Invoices */}
        <Link href="/invoices?status=unpaid" className="block group">
          <Card className="shadow-sm border-neutral-200 bg-white hover:border-blue-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider truncate mr-2">Unpaid Invoices</CardTitle>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md shrink-0"><Receipt size={16} /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight truncate" title={formatCurrency(unpaidInvoicesTotal)}>
                {formatCurrency(unpaidInvoicesTotal)}
              </div>
              <p className="text-[10px] sm:text-xs text-blue-600 font-medium mt-1 truncate">{unpaidInvoicesCount} invoice(s) pending</p>
            </CardContent>
          </Card>
        </Link>

        {/* PERIOD METRIC: Expenses */}
        <Link href={`/expenses?month=${selectedMonth}&year=${selectedYear}`} className="block group">
          <Card className="shadow-sm border-neutral-200 bg-white hover:border-rose-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider truncate mr-2">Total Expenses</CardTitle>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-md shrink-0"><CreditCard size={16} /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight truncate" title={formatCurrency(periodExpenses)}>
                {formatCurrency(periodExpenses)}
              </div>
              <p className="text-[9px] sm:text-[10px] text-rose-600 mt-1.5 font-bold uppercase tracking-widest bg-rose-50 border border-rose-100 inline-block px-1.5 py-0.5 rounded truncate max-w-full">
                {periodLabel}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* PERIOD METRIC: Tx Volume */}
        <Link href={`/transactions?month=${selectedMonth}&year=${selectedYear}`} className="block group">
          <Card className="shadow-sm border-neutral-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider truncate mr-2">Tx Volume</CardTitle>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md shrink-0"><Activity size={16} /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight truncate" title={String(periodTransactions)}>
                {periodTransactions}
              </div>
              <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-widest font-medium truncate">{periodLabel}</p>
            </CardContent>
          </Card>
        </Link>

        {/* PERIOD METRIC: Taxes */}
        {canSeeTaxes && (
          <Link href={`/taxes?month=${selectedMonth}&year=${selectedYear}`} className="block group">
            <Card className="shadow-sm border-neutral-200 bg-white hover:border-orange-400 hover:shadow-md transition-all duration-200 h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-[10px] sm:text-xs font-semibold text-neutral-500 uppercase tracking-wider truncate mr-2">Taxes Paid</CardTitle>
                <div className="p-1.5 bg-orange-50 text-orange-600 rounded-md shrink-0"><Landmark size={16} /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl md:text-3xl font-bold text-neutral-900 tracking-tight truncate" title={formatCurrency(periodTaxesPaid)}>
                  {formatCurrency(periodTaxesPaid)}
                </div>
                <p className="text-[9px] sm:text-[10px] text-orange-600 mt-1.5 font-bold uppercase tracking-widest bg-orange-50 border border-orange-100 inline-block px-1.5 py-0.5 rounded truncate max-w-full">
                  {periodLabel}
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* THE EXECUTIVE APPROVAL QUEUE */}
      {isOwner && pendingRefunds.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 md:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none transform translate-x-4 -translate-y-8">🔔</div>
          <div className="flex items-center gap-3 mb-5 relative z-10">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-bold shadow-sm">{pendingRefunds.length}</span>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-amber-900 tracking-tight">Pending Approvals</h3>
              <p className="text-xs md:text-sm text-amber-700">Staff members have requested the following financial actions.</p>
            </div>
          </div>
          <div className="space-y-3 relative z-10">
            {pendingRefunds.map((refund) => (
              <div key={refund.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 md:p-5 rounded-lg border border-amber-100 shadow-sm gap-4 transition-all hover:border-amber-300">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-100 text-amber-800 text-[9px] md:text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">Refund Request</span>
                    <span className="text-[10px] md:text-xs text-neutral-400">{new Date(refund.created_at).toLocaleString()}</span>
                  </div>
                  <p className="font-bold text-neutral-900 text-base md:text-lg">{formatCurrency(Number(refund.amount))}</p>
                  <p className="text-xs md:text-sm text-neutral-600 mt-1">Requested by <span className="font-semibold text-neutral-900">{refund.requester_name}</span> • Reason: {refund.reason}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3 w-full md:w-auto">
                  <form action={async () => { "use server"; await reviewRefund(refund.id, 'reject'); }} className="w-full sm:w-auto">
                    <Button type="submit" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-9 md:h-10 text-xs md:text-sm">Reject</Button>
                  </form>
                  <form action={async () => { "use server"; await reviewRefund(refund.id, 'approve'); }} className="w-full sm:w-auto">
                    <Button type="submit" className="w-full bg-amber-600 text-white hover:bg-amber-700 shadow-sm h-9 md:h-10 text-xs md:text-sm">Approve & Deduct</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECENT ACTIVITY FEED */}
      <div className="mt-8">
        <h3 className="text-base md:text-lg font-semibold text-neutral-900 mb-4">Recent Activity ({periodLabel})</h3>
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm whitespace-nowrap min-w-[600px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 md:px-6 py-3 md:py-4 font-medium text-neutral-900">Date</th>
                <th className="px-4 md:px-6 py-3 md:py-4 font-medium text-neutral-900">Entity</th>
                <th className="px-4 md:px-6 py-3 md:py-4 font-medium text-neutral-900">Description</th>
                <th className="px-4 md:px-6 py-3 md:py-4 font-medium text-neutral-900 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {top5Activity.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No activity logged for this period.</td></tr>
              ) : (
                top5Activity.map((activity) => (
                  <tr key={`${activity.type}-${activity.id}`} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 md:px-6 py-3 md:py-4 text-neutral-500">{new Date(activity.date).toLocaleDateString()}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-neutral-900">{activity.party}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-neutral-600">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-[11px] uppercase tracking-wider font-bold ${activity.type === 'income' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                        {activity.description.length > 30 ? activity.description.substring(0, 30) + '...' : activity.description}
                      </span>
                    </td>
                    <td className={`px-4 md:px-6 py-3 md:py-4 text-right font-bold ${activity.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {activity.type === 'income' ? '+' : '-'}{formatCurrency(activity.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}