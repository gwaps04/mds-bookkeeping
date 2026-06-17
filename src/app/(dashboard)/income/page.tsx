// src/app/(dashboard)/income/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createIncome } from "@/features/income/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function IncomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get Business Profile & Currency
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(business_name, currency)")
    .eq("id", user?.id)
    .single();

  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // 2. Fetch Assets (Where money goes) & Revenue (Where money came from)
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("business_id", profile?.business_id)
    .in("type", ["asset", "revenue"]) 
    .order("name");

  const bankAccounts = accounts?.filter(a => a.type === "asset") || [];
  const revenueCategories = accounts?.filter(a => a.type === "revenue") || [];

  // 3. Fetch Historical Income with Customer Names & Category Names attached
  const { data: incomeRecords } = await supabase
    .from("income")
    .select(`
      *,
      customers (name),
      accounts!income_category_id_fkey (name)
    `)
    .eq("business_id", profile?.business_id)
    .order("date", { ascending: false });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Income & Sales</h2>
        <p className="text-neutral-500 mt-1">Record instant cash receipts, retail sales, and inbound transfers.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* LOG INCOME FORM */}
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg">Record Cash Receipt</CardTitle>
              <CardDescription>Log money entering the business.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                "use server";
                await createIncome(formData);
              }} className="space-y-4">
                
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer / Client</Label>
                  <Input id="customer_name" name="customer_name" placeholder="e.g. Juan Dela Cruz, Walk-in" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" name="date" type="date" required />
                  </div>
                </div>

                {/* DYNAMIC REVENUE CATEGORY DROPDOWN */}
                <div className="space-y-2">
                  <Label htmlFor="category_id">Revenue Category</Label>
                  <Select name="category_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {revenueCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* DYNAMIC DEPOSIT TO DROPDOWN */}
                <div className="space-y-2">
                  <Label htmlFor="account_id">Deposit To (Bank / Cash)</Label>
                  <Select name="account_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {bankAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_number">Reference Number (Optional)</Label>
                  <Input id="reference_number" name="reference_number" placeholder="e.g. GCash Ref, Check No." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Notes (Optional)</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Provide details about this sale..." 
                    className="resize-none h-20"
                  />
                </div>

                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white">Record Income</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* INCOME DATA TABLE */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 font-medium text-neutral-900">Date</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Customer</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Category</th>
                  <th className="px-6 py-4 font-medium text-neutral-900 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {(!incomeRecords || incomeRecords.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                      No income logged yet.
                    </td>
                  </tr>
                ) : (
                  (incomeRecords as any[]).map((inc) => (
                    <tr key={inc.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-neutral-500">
                        {new Date(inc.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-900">
                        {inc.customers?.name || 'Walk-in'}
                        {inc.reference_number && (
                          <span className="block text-xs text-neutral-400 font-normal">Ref: {inc.reference_number}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          {inc.accounts?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">
                        +{formatCurrency(Number(inc.amount))}
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