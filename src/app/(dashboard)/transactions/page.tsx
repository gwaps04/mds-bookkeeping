// src/app/(dashboard)/transactions/page.tsx
import { createClient } from "@/lib/supabase/server";
import { recordTransaction } from "@/features/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user?.id)
    .single();

  // Fetch Accounts to populate the dropdown
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, category")
    .eq("business_id", profile?.business_id)
    .order("name");

  // Fetch Transactions to populate the table (JOIN with accounts to get the account name)
  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      *,
      accounts ( name )
    `)
    .eq("business_id", profile?.business_id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Ledger Transactions</h2>
        <p className="text-neutral-500 mt-1">Record income and expenses against your configured accounts.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* FORM COLUMN */}
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg">Record Entry</CardTitle>
              <CardDescription>Post a new transaction to the ledger.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Remember our async wrapper to satisfy React 19 types! */}
              <form action={async (formData) => {
                "use server";
                await recordTransaction(formData);
              }} className="space-y-4">
                
                <div className="space-y-2">
                  <Label htmlFor="account_id">Target Account</Label>
                  <select id="account_id" name="account_id" required className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2">
                    <option value="" disabled defaultValue="">Select an account...</option>
                    {accounts?.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.category})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <select id="type" name="type" required className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950">
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction_date">Date</Label>
                  <Input id="transaction_date" name="transaction_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" placeholder="e.g. Monthly Internet Bill" required />
                </div>

                <Button type="submit" className="w-full">Post Transaction</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* DATA TABLE COLUMN */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 font-medium text-neutral-900">Date</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Description</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Account</th>
                  <th className="px-6 py-4 font-medium text-neutral-900 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {transactions?.map((trx) => {
                  // Handle Supabase join typing
                  const accountData = Array.isArray(trx.accounts) ? trx.accounts[0] : trx.accounts;
                  
                  return (
                    <tr key={trx.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-neutral-500">{trx.transaction_date}</td>
                      <td className="px-6 py-4 font-medium text-neutral-900">{trx.description}</td>
                      <td className="px-6 py-4 text-neutral-600">{accountData?.name}</td>
                      <td className={`px-6 py-4 text-right font-medium ${trx.type === 'income' ? 'text-green-600' : 'text-neutral-900'}`}>
                        {trx.type === 'income' ? '+' : '-'} {Number(trx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )
                })}
                
                {(!transactions || transactions.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                      No transactions recorded. Post an entry to update the ledger.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}