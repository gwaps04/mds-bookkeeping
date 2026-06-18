// src/app/(dashboard)/transactions/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;

  // 1. Fetch Expenses
  const { data: expenses } = await supabase
    .from("expenses")
    .select(`
      id, date, description, amount,
      bank:accounts!expenses_account_id_fkey(name),
      category:accounts!expenses_category_id_fkey(name)
    `)
    .eq("business_id", businessId);

  // 2. Fetch Income
  const { data: income } = await supabase
    .from("income")
    .select(`
      id, date, description, amount,
      bank:accounts!income_account_id_fkey(name),
      category:accounts!income_category_id_fkey(name)
    `)
    .eq("business_id", businessId);

  // 3. Merge & Sort Timeline
  const allTransactions = [
    ...(income || []).map(i => ({ ...i, type: "Income" })),
    ...(expenses || []).map(e => ({ ...e, type: "Expense" }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER & EXPORT BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Unified Ledger</h2>
          <p className="text-neutral-500 mt-1">A complete history of your income and expenses.</p>
        </div>
        
        {/* THE MAGIC CSV BUTTON */}
        <a href="/api/export" download>
          <Button className="bg-green-700 hover:bg-green-800 text-white shadow-sm font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export to CSV
          </Button>
        </a>
      </div>

      {/* UNIFIED TRANSACTIONS TABLE */}
      <Card className="shadow-sm border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>All records sorted by date.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                <tr>
                  <th className="px-6 py-3 font-medium text-neutral-900">Date</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Description</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Category</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Paid From / To</th>
                  <th className="px-6 py-3 font-medium text-neutral-900 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {allTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  allTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-neutral-500">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-900">
                        {t.description}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                          {(t.category as any)?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500">
                        {(t.bank as any)?.name || 'Unknown Account'}
                      </td>
                      <td className={`px-6 py-4 font-bold text-right ${t.type === 'Income' ? 'text-green-600' : 'text-neutral-900'}`}>
                        {t.type === 'Income' ? '+' : '-'}₱{Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}