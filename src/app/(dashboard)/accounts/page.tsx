// src/app/(dashboard)/accounts/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createAccount } from "@/features/accounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch their profile to get the business_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user?.id)
    .single();

  // Fetch all accounts belonging to this business
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("business_id", profile?.business_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Chart of Accounts</h2>
        <p className="text-neutral-500 mt-1">Define the financial vessels for your ledger.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* FORM COLUMN */}
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg">Register Account</CardTitle>
              <CardDescription>Add a new tracking category to your business.</CardDescription>
            </CardHeader>
            <CardContent>
             <form action={async (formData) => {
  "use server";
  await createAccount(formData);
}} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input id="name" name="name" placeholder="e.g. BDO Checking" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select 
                    id="category" 
                    name="category" 
                    required
                    className="flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled defaultValue="">Select a type...</option>
                    <option value="Asset">Asset (Cash, Bank)</option>
                    <option value="Liability">Liability (Credit, Loan)</option>
                    <option value="Equity">Equity (Capital)</option>
                    <option value="Revenue">Revenue (Sales)</option>
                    <option value="Expense">Expense (Bills, Payroll)</option>
                  </select>
                </div>

                <Button type="submit" className="w-full">Create Account</Button>
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
                  <th className="px-6 py-4 font-medium text-neutral-900">Account Name</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Category</th>
                  <th className="px-6 py-4 font-medium text-neutral-900 text-right">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {accounts?.map((account) => (
                  <tr key={account.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900">{account.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                        {account.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500 text-right">
                      {new Date(account.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                
                {(!accounts || accounts.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                      No accounts configured yet. Create one to get started.
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