// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch the Profile, Role, and ALL Business Settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id, businesses(currency, is_tax_registered, show_net_cash_to_staff, show_taxes_to_staff)")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;
  const role = profile?.role;
  const isOwner = role === 'business_owner' || role === 'super_admin';

  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";
  const isTaxEnabled = bizData?.is_tax_registered || false;

  // --- DYNAMIC DASHBOARD VISIBILITY CONTROLS ---
  // Owners ALWAYS see Net Cash. Staff only see it if the toggle is true.
  const canSeeNetCash = isOwner || bizData?.show_net_cash_to_staff !== false;
  
  // Owners see taxes if the tax module is enabled. Staff only see it if the module is enabled AND the toggle is true.
  const canSeeTaxes = isTaxEnabled && (isOwner || bizData?.show_taxes_to_staff === true);


  // 2. Fetch Live Data
  const { data: incomeData } = await supabase
    .from("income")
    .select("id, amount, date, description, customers(name)")
    .eq("business_id", businessId);

  const { data: expenseData } = await supabase
    .from("expenses")
    .select("id, amount, date, description, vendors(name), accounts!expenses_category_id_fkey(name)")
    .eq("business_id", businessId);

  const { data: invoiceData } = await supabase
    .from("invoices")
    .select("total_amount, status")
    .eq("business_id", businessId);

  // 3. The Analytics Engine
  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionsThisMonth = 0;
  let totalTaxesPaid = 0; 
  
  let unpaidInvoicesTotal = 0;
  let unpaidInvoicesCount = 0;

  const recentActivity: any[] = [];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Process Income
  (incomeData || []).forEach((inc) => {
    totalIncome += Number(inc.amount);
    const tDate = new Date(inc.date);
    if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) transactionsThisMonth++;
    recentActivity.push({
      id: inc.id, type: "income", amount: Number(inc.amount), date: inc.date,
      party: (inc.customers as any)?.name || "Walk-in Customer",
      description: inc.description || "Cash Receipt"
    });
  });

  // Process Expenses & Taxes
  (expenseData || []).forEach((exp) => {
    const expenseAmount = Number(exp.amount);
    totalExpenses += expenseAmount;
    const tDate = new Date(exp.date);
    if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) transactionsThisMonth++;
    
    const category = exp.accounts as any;
    if (category?.name && category.name.toLowerCase().includes("tax")) totalTaxesPaid += expenseAmount;

    recentActivity.push({
      id: exp.id, type: "expense", amount: expenseAmount, date: exp.date,
      party: (exp.vendors as any)?.name || "System Record",
      description: exp.description || "Business Expense"
    });
  });

  // Process Invoices
  (invoiceData || []).forEach((inv) => {
    if (inv.status === 'sent') {
      unpaidInvoicesTotal += Number(inv.total_amount);
      unpaidInvoicesCount++;
    }
  });

  const totalCash = totalIncome - totalExpenses;

  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const top5Activity = recentActivity.slice(0, 5);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  // Determine Grid Layout Based on Visible Cards
  let visibleCards = 2; // Unpaid Invoices & Transactions are always visible
  if (canSeeNetCash) visibleCards++;
  if (canSeeTaxes) visibleCards++;

  let gridClass = "grid gap-6 md:grid-cols-2 lg:grid-cols-2"; // Fallback for 2 cards
  if (visibleCards === 3) gridClass = "grid gap-6 md:grid-cols-3";
  if (visibleCards === 4) gridClass = "grid gap-6 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">System Overview</h2>
        <p className="text-neutral-500 mt-1">Welcome to your financial command center.</p>
      </div>

      <div className={gridClass}>
        
        {/* TOTAL CASH BALANCE (CONTROLLED BY RBAC) */}
        {canSeeNetCash && (
          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Net Cash Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl lg:text-4xl font-bold ${totalCash < 0 ? 'text-red-600' : 'text-neutral-900'}`}>
                {formatCurrency(totalCash)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* UNPAID INVOICES (ALWAYS VISIBLE) */}
        <Card className="shadow-sm border-neutral-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Unpaid Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl lg:text-4xl font-bold text-neutral-900">{formatCurrency(unpaidInvoicesTotal)}</div>
            <p className="text-xs lg:text-sm text-neutral-500 mt-1">{unpaidInvoicesCount} invoice(s) awaiting payment</p>
          </CardContent>
        </Card>

        {/* TRANSACTIONS THIS MONTH (ALWAYS VISIBLE) */}
        <Card className="shadow-sm border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Transactions This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl lg:text-4xl font-bold text-neutral-900">{transactionsThisMonth}</div>
          </CardContent>
        </Card>

        {/* EXECUTIVE TAX DASHBOARD (CONTROLLED BY RBAC) */}
        {canSeeTaxes && (
          <Link href="/taxes" className="block transition-transform hover:-translate-y-1 duration-200">
            <Card className="shadow-sm border-orange-200 bg-orange-50/50 hover:bg-orange-50 cursor-pointer h-full">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-orange-700 uppercase tracking-wider">Total Taxes Paid</CardTitle>
                <span className="text-orange-400 text-xs">↗</span>
              </CardHeader>
              <CardContent>
                <div className="text-3xl lg:text-4xl font-bold text-neutral-900">{formatCurrency(totalTaxesPaid)}</div>
                <p className="text-xs lg:text-sm text-orange-600/80 mt-1 hover:underline">View BIR Tracker</p>
              </CardContent>
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
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                    No recent activity. Log an income or expense to see it here.
                  </td>
                </tr>
              ) : (
                top5Activity.map((activity) => (
                  <tr key={`${activity.type}-${activity.id}`} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(activity.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {activity.party}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activity.type === 'income' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {activity.description.length > 30 ? activity.description.substring(0, 30) + '...' : activity.description}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${
                      activity.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
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