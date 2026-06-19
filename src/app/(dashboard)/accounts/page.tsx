// src/app/(dashboard)/accounts/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createAccount, deleteAccount } from "@/features/accounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";

export default async function AccountsPage(props: { searchParams: Promise<{ search?: string, type?: string }> }) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';

  // BUILD SEARCH & FILTER QUERY
  let query = supabase
    .from("accounts")
    .select("*")
    .eq("business_id", businessId)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (params?.search) query = query.ilike("name", `%${params.search}%`);
  if (params?.type && params.type !== "all") query = query.eq("type", params.type);

  const { data: accounts } = await query;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Chart of Accounts</h2>
          <p className="text-neutral-500 mt-1">Manage your banks, cash accounts, and ledger categories.</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        
        {/* LEFT COLUMN: ADD ACCOUNT FORM (OWNERS ONLY) */}
        <div className="md:col-span-1">
          {isOwner ? (
            <Card className="shadow-sm border-neutral-200 sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Add New Account</CardTitle>
                <CardDescription>Expand your financial ledger structure.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={async (formData) => {
                  "use server";
                  await createAccount(formData);
                }} className="space-y-4">
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Account Name</Label>
                    <Input id="name" name="name" placeholder="e.g. BDO Checking, Marketing Exp" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Financial Type</Label>
                    <Select name="type" required>
                      <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset (Banks/Cash)</SelectItem>
                        <SelectItem value="revenue">Revenue (Income)</SelectItem>
                        <SelectItem value="expense">Expense (Outflows)</SelectItem>
                        <SelectItem value="liability">Liability (Loans/Payables)</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Sub-Category (Optional)</Label>
                    <Input id="category" name="category" placeholder="e.g. Current Asset, Utility" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_number">Bank / Account No. (Optional)</Label>
                    <Input id="account_number" name="account_number" placeholder="e.g. 1010, 0001-2345" />
                  </div>

                  <div className="pt-2">
                    <SubmitButton 
                      title="Create Account" 
                      loadingTitle="Creating..." 
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white" 
                    />
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border-neutral-200 sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Structural Controls</CardTitle>
                <CardDescription>Account creation is restricted.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800">
                  <span className="font-bold block mb-1">Access Restricted:</span>
                  Only Business Owners have permission to modify the structural Chart of Accounts. Please contact your administrator to add new banks or categories.
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: FILTERS & TABLE */}
        <div className="md:col-span-2 space-y-4">
          
          {/* SEARCH & FILTER BAR */}
          <Card className="shadow-sm border-neutral-200 bg-white">
            <CardContent className="p-4">
              <form method="GET" className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                  <Label className="text-xs text-neutral-500">Search Accounts</Label>
                  <Input name="search" placeholder="Search by name..." defaultValue={params?.search} />
                </div>
                <div className="w-full md:w-48 space-y-1">
                  <Label className="text-xs text-neutral-500">Filter by Type</Label>
                  <Select name="type" defaultValue={params?.type || "all"}>
                    <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="asset">Assets (Banks/Cash)</SelectItem>
                      <SelectItem value="revenue">Revenue Categories</SelectItem>
                      <SelectItem value="expense">Expense Categories</SelectItem>
                      <SelectItem value="liability">Liabilities (Loans)</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Button type="submit" className="bg-neutral-900 text-white">Filter</Button>
                  {(params?.search || params?.type) && (
                    <Link href="/accounts"><Button variant="outline" className="text-neutral-500">Clear</Button></Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ACCOUNTS DATA TABLE */}
          <Card className="shadow-sm border-neutral-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[500px]">
                  <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 font-medium text-neutral-900">Account Name</th>
                      <th className="px-4 py-3 font-medium text-neutral-900">Type & Category</th>
                      <th className="px-4 py-3 font-medium text-neutral-900 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {(!accounts || accounts.length === 0) ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">No accounts found.</td>
                      </tr>
                    ) : (
                      accounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-neutral-50 group transition-colors">
                          <td className="px-4 py-4">
                            <p className="font-bold text-neutral-900">{acc.name}</p>
                            {acc.account_number && <p className="text-xs text-neutral-500 font-mono mt-0.5">Acc No: {acc.account_number}</p>}
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 uppercase tracking-wider border border-neutral-200 mr-2">
                              {acc.type}
                            </span>
                            <span className="text-neutral-500 text-xs">{acc.category}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              
                              <Link href={`/accounts/${acc.id}/edit`}>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50">Edit</Button>
                              </Link>

                              {isOwner && (
                                <form action={async (formData) => {
                                  "use server";
                                  await deleteAccount(formData);
                                }}>
                                  <input type="hidden" name="id" value={acc.id} />
                                  <Button type="submit" variant="destructive" size="sm" className="h-8 px-3 text-xs">Delete</Button>
                                </form>
                              )}

                            </div>
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
      </div>
    </div>
  );
}