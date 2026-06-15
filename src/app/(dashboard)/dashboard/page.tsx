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

  // 2. Fetch all transactions, strictly joining the account category to filter out non-cash movements
  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      amount,
      type,
      transaction_date,
      accounts!inner(category)
    `)
    .eq("business_id", businessId);

  // 3. The Analytics Engine
  let totalCash = 0;
  let transactionsThisMonth = 0;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  if (transactions) {
    transactions.forEach((t) => {
      // Supabase Join Handling
      const accData = t.accounts as any;
      const accountCategory = Array.isArray(accData) ? accData[0]?.category : accData?.category;

      // Only calculate physical cash movements (Assets)
      if (accountCategory === 'Asset') {
        if (t.type === 'income') totalCash += Number(t.amount);
        if (t.type === 'expense') totalCash -= Number(t.amount);
      }

      // Calculate transaction volume for the current month
      const tDate = new Date(t.transaction_date);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        transactionsThisMonth++;
      }
    });
  }

  // 4. Native Browser Currency Formatting
  const formattedTotal = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: currency,
  }).format(totalCash);

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
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Cash Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${totalCash < 0 ? 'text-red-600' : 'text-neutral-900'}`}>
              {formattedTotal}
            </div>
          </CardContent>
        </Card>

        {/* UNPAID INVOICES (Static for now) */}
        <Card className="shadow-sm border-neutral-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Unpaid Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-neutral-900">0</div>
            <p className="text-sm text-neutral-500 mt-1">Pending module build</p>
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
    </div>
  );
}