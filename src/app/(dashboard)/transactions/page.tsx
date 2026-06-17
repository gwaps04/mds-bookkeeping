// src/app/(dashboard)/transactions/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get Profile & Currency
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(currency)")
    .eq("id", user?.id)
    .single();

  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";
  const businessId = profile?.business_id;

  // 2. Fetch All Live Data
  const { data: incomeData } = await supabase
    .from("income")
    .select("id, amount, date, description, customers(name)")
    .eq("business_id", businessId);

  const { data: expenseData } = await supabase
    .from("expenses")
    .select("id, amount, date, description, vendors(name)")
    .eq("business_id", businessId);

  // 3. The Grand Ledger Merger
  const allTransactions: any[] = [];

  (incomeData || []).forEach((inc) => {
    const customer = inc.customers as any;
    allTransactions.push({
      id: `inc-${inc.id}`,
      type: 'income',
      date: inc.date,
      entity: customer?.name || 'Walk-in Customer',
      description: inc.description || 'Cash Receipt',
      amount: Number(inc.amount)
    });
  });

  (expenseData || []).forEach((exp) => {
    const vendor = exp.vendors as any;
    allTransactions.push({
      id: `exp-${exp.id}`,
      type: 'expense',
      date: exp.date,
      entity: vendor?.name || 'Unknown Vendor',
      description: exp.description || 'Business Expense',
      amount: Number(exp.amount)
    });
  });

  // 4. Sort strictly by Date (Newest first)
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Unified Ledger</h2>
        <p className="text-neutral-500 mt-1">A chronological master record of all money moving in and out of your business.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 font-medium text-neutral-900">Date</th>
              <th className="px-6 py-4 font-medium text-neutral-900">Type</th>
              <th className="px-6 py-4 font-medium text-neutral-900">Entity</th>
              <th className="px-6 py-4 font-medium text-neutral-900">Description</th>
              <th className="px-6 py-4 font-medium text-neutral-900 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {allTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              allTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 text-neutral-500">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tx.type === 'income' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {tx.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {tx.entity}
                  </td>
                  <td className="px-6 py-4 text-neutral-600">
                    {tx.description}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${
                    tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}