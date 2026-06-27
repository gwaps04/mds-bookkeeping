// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { reviewRefund } from "@/features/refunds/actions";
import Link from "next/link";

// 🚀 ENTERPRISE CACHE OVERRIDE: 
// This forces Next.js to fetch fresh data from the database on every single page load.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch Profile, Role, and Business Settings
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

  // 2. Fetch Live Data
  const { data: incomeData } = await supabase.from("income").select("id, amount, date, description, customers(name)").eq("business_id", businessId);
  const { data: expenseData } = await supabase.from("expenses").select("id, amount, date, description, vendors(name), accounts!expenses_category_id_fkey(name)").eq("business_id", businessId);
  const { data: invoiceData } = await supabase.from("invoices").select("total_amount, status, income(amount)").eq("business_id", businessId);
  
  // --- 3. BULLETPROOF REFUND QUERY ---
  // Step A: Fetch the raw refunds without the complex join to avoid foreign key mismatch errors
  const { data: rawRefunds } = await supabase
    .from("refund_requests")
    .select("id, amount, reason, created_at, requested_by")
    .eq("business_id", businessId)
    .eq("status", "pending");

  let pendingRefunds: any[] = rawRefunds || [];

  // Step B: Manually stitch the Staff Names to the refunds
  if (pendingRefunds.length > 0) {
    const userIds = pendingRefunds.map(r => r.requested_by);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    pendingRefunds = pendingRefunds.map(refund => {
      const prof = profiles?.find(p => p.id === refund.requested_by);
      return { ...refund, requester_name: prof?.full_name || 'Staff Member' };
    });
  }

  // 4. Analytics Engine
  let totalIncome = 0; let totalExpenses = 0; let transactionsThisMonth = 0; let totalTaxesPaid = 0; 
  let unpaidInvoicesTotal = 0; let unpaidInvoicesCount = 0;
  
  const recentActivity: any[] = [];
  const currentMonth = new Date().getMonth(); const currentYear = new Date().getFullYear();

  (incomeData || []).forEach((inc) => {
    totalIncome += Number(inc.amount);
    const tDate = new Date(inc.date);
    if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) transactionsThisMonth++;
    recentActivity.push({ id: inc.id, type: "income", amount: Number(inc.amount), date: inc.date, party: (inc.customers as any)?.name || "Walk-in Customer", description: inc.description || "Cash Receipt" });
  });

  (expenseData || []).forEach((exp) => {
    const amt = Number(exp.amount);
    totalExpenses += amt;
    const tDate = new Date(exp.date);
    if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) transactionsThisMonth++;
    if ((exp.accounts as any)?.name?.toLowerCase().includes("tax")) totalTaxesPaid += amt;
    recentActivity.push({ id: exp.id, type: "expense", amount: amt, date: exp.date, party: (exp.vendors as any)?.name || "System Record", description: exp.description || "Business Expense" });
  });

  (invoiceData || []).forEach((inv) => {
    if (inv.status === 'sent') {
      const remainingBalance = Math.max(0, Number(inv.total_amount) - (inv.income as any[] || []).reduce((sum, p) => sum + Number(p.amount), 0));
      if (remainingBalance > 0) { unpaidInvoicesTotal += remainingBalance; unpaidInvoicesCount++; }
    }
  });

  const totalCash = totalIncome - totalExpenses;
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const top5Activity = recentActivity.slice(0, 5);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  let visibleCards = 2; 
  if (canSeeNetCash) visibleCards++;
  if (canSeeTaxes) visibleCards++;
  let gridClass = visibleCards === 4 ? "grid gap-6 md:grid-cols-2 lg:grid-cols-4" : visibleCards === 3 ? "grid gap-6 md:grid-cols-3" : "grid gap-6 md:grid-cols-2 lg:grid-cols-2";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Hi, {businessName}.</h2>
        <p className="text-neutral-500 mt-1">Welcome to your financial command center.</p>
      </div>

      {/* =========================================================================
          THE EXECUTIVE APPROVAL QUEUE
          ========================================================================= */}
      {isOwner && pendingRefunds.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none transform translate-x-4 -translate-y-8">🔔</div>
          
          <div className="flex items-center gap-3 mb-5 relative z-10">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-white text-sm font-bold shadow-sm">
              {pendingRefunds.length}
            </span>
            <div>
              <h3 className="text-xl font-bold text-orange-900 tracking-tight">Pending Approvals</h3>
              <p className="text-sm text-orange-700">Staff members have requested the following financial actions.</p>
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            {pendingRefunds.map((refund) => (
              <div key={refund.id} className="flex flex-col md:flex-row md:items-center justify-between bg-white p-5 rounded-lg border border-orange-100 shadow-sm gap-4 transition-all hover:border-orange-300">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-amber-100 text-amber-800 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">Refund Request</span>
                    <span className="text-xs text-neutral-400">{new Date(refund.created_at).toLocaleString()}</span>
                  </div>
                  <p className="font-bold text-neutral-900 text-lg">{formatCurrency(Number(refund.amount))}</p>
                  <p className="text-sm text-neutral-600 mt-1">
                    Requested by <span className="font-semibold text-neutral-900">{refund.requester_name}</span> • Reason: {refund.reason}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <form action={async () => { "use server"; await reviewRefund(refund.id, 'reject'); }} className="flex-1 md:flex-none">
                    <Button type="submit" variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors">
                      Reject
                    </Button>
                  </form>
                  <form action={async () => { "use server"; await reviewRefund(refund.id, 'approve'); }} className="flex-1 md:flex-none">
                    <Button type="submit" className="w-full bg-orange-600 text-white hover:bg-orange-700 shadow-sm transition-colors">
                      Approve & Deduct Cash
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ========================================================================= */}

      {/* THE METRIC CARDS */}
      <div className={gridClass}>
        {canSeeNetCash && (
          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Net Cash Balance</CardTitle></CardHeader>
            <CardContent><div className={`text-3xl lg:text-4xl font-bold ${totalCash < 0 ? 'text-red-600' : 'text-neutral-900'}`}>{formatCurrency(totalCash)}</div></CardContent>
          </Card>
        )}
        <Card className="shadow-sm border-neutral-200 bg-blue-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Unpaid Invoices</CardTitle></CardHeader>
          <CardContent><div className="text-3xl lg:text-4xl font-bold text-neutral-900">{formatCurrency(unpaidInvoicesTotal)}</div><p className="text-xs lg:text-sm text-neutral-500 mt-1">{unpaidInvoicesCount} invoice(s) awaiting payment</p></CardContent>
        </Card>
        <Card className="shadow-sm border-neutral-200">
          <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Transactions This Month</CardTitle></CardHeader>
          <CardContent><div className="text-3xl lg:text-4xl font-bold text-neutral-900">{transactionsThisMonth}</div></CardContent>
        </Card>
        {canSeeTaxes && (
          <Link href="/taxes" className="block transition-transform hover:-translate-y-1 duration-200">
            <Card className="shadow-sm border-orange-200 bg-orange-50/50 hover:bg-orange-50 cursor-pointer h-full">
              <CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Total Taxes Paid</CardTitle><span className="text-orange-400 text-xs">↗</span></CardHeader>
              <CardContent><div className="text-3xl lg:text-4xl font-bold text-neutral-900">{formatCurrency(totalTaxesPaid)}</div><p className="text-xs lg:text-sm text-orange-600/80 mt-1 hover:underline">View BIR Tracker</p></CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Recent Activity</h3>
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-medium text-neutral-900">Date</th>
                <th className="px-6 py-4 font-medium text-neutral-900">Entity</th>
                <th className="px-6 py-4 font-medium text-neutral-900">Description</th>
                <th className="px-6 py-4 font-medium text-neutral-900 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {top5Activity.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No recent activity. Log an income or expense to see it here.</td></tr>
              ) : (
                top5Activity.map((activity) => (
                  <tr key={`${activity.type}-${activity.id}`} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-neutral-500">{new Date(activity.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-neutral-900">{activity.party}</td>
                    <td className="px-6 py-4 text-neutral-600">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activity.type === 'income' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {activity.description.length > 30 ? activity.description.substring(0, 30) + '...' : activity.description}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${activity.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
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


