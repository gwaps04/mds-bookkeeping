// src/app/(dashboard)/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch the Profile and the attached Business Currency
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(currency)")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // 2. Fetch Live Data (Income, Expenses, AND Invoices)
  const { data: incomeData } = await supabase
    .from("income")
    .select("id, amount, date, description, customers(name)")
    .eq("business_id", businessId);

  const { data: expenseData } = await supabase
    .from("expenses")
    .select("id, amount, date, description, vendors(name)")
    .eq("business_id", businessId);

  const { data: invoiceData } = await supabase
    .from("invoices")
    .select("total_amount, status")
    .eq("business_id", businessId);

  // 3. The Analytics Engine
  let totalIncome = 0;
  let totalExpenses = 0;
  let transactionsThisMonth = 0;
  
  let unpaidInvoicesTotal = 0;
  let unpaidInvoicesCount = 0;

  const recentActivity: any[] = [];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Process Income
  (incomeData || []).forEach((inc) => {
    totalIncome += Number(inc.amount);
    
    const tDate = new Date(inc.date);
    if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
      transactionsThisMonth++;
    }

    const customer = inc.customers as any; 

    recentActivity.push({
      id: inc.id,
      type: "income",
      amount: Number(inc.amount),
      date: inc.date,
      party: customer?.name || "Walk-in Customer",
      description: inc.description || "Cash Receipt"
    });
  });

  // Process Expenses
  (expenseData || []).forEach((exp) => {
    totalExpenses += Number(exp.amount);
    
    const tDate = new Date(exp.date);
    if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
      transactionsThisMonth++;
    }

    const vendor = exp.vendors as any;

    recentActivity.push({
      id: exp.id,
      type: "expense",
      amount: Number(exp.amount),
      date: exp.date,
      party: vendor?.name || "Unknown Vendor",
      description: exp.description || "Business Expense"
    });
  });

  // Process Invoices (Accounts Receivable)
  (invoiceData || []).forEach((inv) => {
    if (inv.status === 'sent') {
      unpaidInvoicesTotal += Number(inv.total_amount);
      unpaidInvoicesCount++;
    }
  });

  // Calculate Net Cash Flow
  const totalCash = totalIncome - totalExpenses;

  // Sort Recent Activity by Date (Newest First) and grab the top 5
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const top5Activity = recentActivity.slice(0, 5);

  // 4. Native Browser Currency Formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">System Overview</h2>
        <p className="text-neutral-500 mt-1">Welcome to your financial command center.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* TOTAL CASH BALANCE */}
        <Card className="shadow-sm border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Net Cash Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${totalCash < 0 ? 'text-red-600' : 'text-neutral-900'}`}>
              {formatCurrency(totalCash)}
            </div>
          </CardContent>
        </Card>

        {/* UNPAID INVOICES (LIVE) */}
        <Card className="shadow-sm border-neutral-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Unpaid Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-neutral-900">{formatCurrency(unpaidInvoicesTotal)}</div>
            <p className="text-sm text-neutral-500 mt-1">{unpaidInvoicesCount} invoice(s) awaiting payment</p>
          </CardContent>
        </Card>

        {/* TRANSACTIONS THIS MONTH */}
        <Card className="shadow-sm border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Transactions This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-neutral-900">{transactionsThisMonth}</div>
          </CardContent>
        </Card>
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