// src/app/(dashboard)/accounts/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createAccount } from "@/features/accounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get Business ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;

  // 2. Fetch all Accounts and group them by type
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  const groupedAccounts = {
    asset: accounts?.filter(a => a.type === 'asset') || [],
    liability: accounts?.filter(a => a.type === 'liability') || [],
    equity: accounts?.filter(a => a.type === 'equity') || [],
    revenue: accounts?.filter(a => a.type === 'revenue') || [],
    expense: accounts?.filter(a => a.type === 'expense') || [],
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Chart of Accounts</h2>
        <p className="text-neutral-500 mt-1">Manage your financial categories, bank accounts, and expense buckets.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        
        {/* ADD NEW ACCOUNT FORM */}
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200 sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg">Create Account</CardTitle>
              <CardDescription>Add a new bank, credit card, or expense category.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                "use server";
                await createAccount(formData);
              }} className="space-y-4">
                
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input id="name" name="name" placeholder="e.g. Security Bank, Facebook Ads" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Financial Type</Label>
                  <Select name="type" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asset">Asset (Bank Accounts, Cash, Receivables)</SelectItem>
                      <SelectItem value="liability">Liability (Credit Cards, Loans, Payables)</SelectItem>
                      <SelectItem value="equity">Equity (Owner's Capital, Retained Earnings)</SelectItem>
                      <SelectItem value="revenue">Revenue (Sales, Service Income, Interest)</SelectItem>
                      <SelectItem value="expense">Expense (Rent, Payroll, Utilities, Ads)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Sub-Category (Optional)</Label>
                  <Input id="category" name="category" placeholder="e.g. Operating Expense, Credit Card" />
                </div>

                <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white mt-4">
                  Save Account
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ACCOUNT LISTINGS */}
        <div className="md:col-span-2 space-y-6">
          
          {/* ASSETS */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900">Assets</h3>
            </div>
            <ul className="divide-y divide-neutral-100">
              {groupedAccounts.asset.length === 0 ? <li className="px-6 py-4 text-sm text-neutral-500">No assets configured.</li> : 
                groupedAccounts.asset.map(acc => (
                  <li key={acc.id} className="px-6 py-4 flex justify-between items-center hover:bg-neutral-50">
                    <span className="font-medium text-sm text-neutral-900">{acc.name}</span>
                    {acc.category && <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded">{acc.category}</span>}
                  </li>
              ))}
            </ul>
          </div>

          {/* REVENUE */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-green-50 px-6 py-3 border-b border-green-100">
              <h3 className="font-semibold text-green-900">Revenue</h3>
            </div>
            <ul className="divide-y divide-neutral-100">
              {groupedAccounts.revenue.length === 0 ? <li className="px-6 py-4 text-sm text-neutral-500">No revenue accounts configured.</li> : 
                groupedAccounts.revenue.map(acc => (
                  <li key={acc.id} className="px-6 py-4 flex justify-between items-center hover:bg-neutral-50">
                    <span className="font-medium text-sm text-neutral-900">{acc.name}</span>
                    {acc.category && <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded">{acc.category}</span>}
                  </li>
              ))}
            </ul>
          </div>

          {/* EXPENSES */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-red-50 px-6 py-3 border-b border-red-100">
              <h3 className="font-semibold text-red-900">Expenses</h3>
            </div>
            <ul className="divide-y divide-neutral-100">
              {groupedAccounts.expense.length === 0 ? <li className="px-6 py-4 text-sm text-neutral-500">No expense accounts configured.</li> : 
                groupedAccounts.expense.map(acc => (
                  <li key={acc.id} className="px-6 py-4 flex justify-between items-center hover:bg-neutral-50">
                    <span className="font-medium text-sm text-neutral-900">{acc.name}</span>
                    {acc.category && <span className="text-xs text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded">{acc.category}</span>}
                  </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}