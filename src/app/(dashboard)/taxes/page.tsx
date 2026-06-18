// src/app/(dashboard)/taxes/page.tsx
import { createClient } from "@/lib/supabase/server";
import { logTaxPayment, deleteTaxPayment } from "@/features/taxes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TaxesPage(props: { searchParams: Promise<{ search?: string, from?: string, to?: string }> }) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get Profile & Business Data
  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';

  const { data: business } = await supabase.from("businesses").select("is_tax_registered, tax_id").eq("id", businessId).single();
  if (!business?.is_tax_registered) redirect("/settings");

  // 2. Fetch Asset Accounts
  const { data: bankAccounts } = await supabase.from("accounts").select("id, name, account_number").eq("business_id", businessId).eq("type", "asset").order("name");

  // 3. Fetch the ID for "Taxes, Licenses & Fees"
  const { data: taxCategory } = await supabase.from("accounts").select("id").eq("business_id", businessId).eq("name", "Taxes, Licenses & Fees").single();

  // 4. BUILD THE SEARCH & FILTER QUERY FOR TAXES
  let query = supabase
    .from("expenses")
    .select(`id, amount, date, description, reference_number, accounts!expenses_account_id_fkey(name)`)
    .eq("business_id", businessId)
    .order("date", { ascending: false });

  // ONLY show expenses categorized as Taxes!
  if (taxCategory) {
    query = query.eq("category_id", taxCategory.id);
  } else {
    // If they have no tax category yet, artificially force an empty result so it doesn't show all expenses
    query = query.eq("category_id", "00000000-0000-0000-0000-000000000000"); 
  }

  if (params?.search) query = query.ilike("description", `%${params.search}%`);
  if (params?.from) query = query.gte("date", params.from);
  if (params?.to) query = query.lte("date", params.to);

  const { data: taxHistory } = await query;
  const totalTaxesPaid = (taxHistory || []).reduce((sum, record) => sum + Number(record.amount), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">BIR Tax Tracker</h2>
          <p className="text-neutral-500 mt-1">Log and monitor your official tax remittances.</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg flex items-center gap-3">
          <span className="text-sm font-medium text-blue-800">Registered TIN:</span>
          <span className="font-mono font-bold text-blue-900 tracking-wider">{business?.tax_id || 'NOT SET'}</span>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        
        {/* LOG PAYMENT FORM */}
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200 sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg">Record Tax Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                "use server";
                await logTaxPayment(formData);
              }} className="space-y-4">
                
                <div className="space-y-2">
                  <Label htmlFor="form_type">BIR Form Type</Label>
                  <Select name="form_type" required>
                    <SelectTrigger><SelectValue placeholder="Select BIR form..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2551Q">2551Q (Quarterly Percentage Tax)</SelectItem>
                      <SelectItem value="1701Q">1701Q (Quarterly Income Tax)</SelectItem>
                      <SelectItem value="1701A">1701A (Annual Income Tax)</SelectItem>
                      <SelectItem value="0605">0605 (Payment Form / Annual Reg)</SelectItem>
                      <SelectItem value="1601C">1601C (Withholding Tax - Comp)</SelectItem>
                      <SelectItem value="2550M">2550M (Monthly VAT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₱)</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date Paid</Label>
                    <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_id">Paid From (Bank / Cash)</Label>
                  <Select name="account_id" required>
                    <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference No. (Optional)</Label>
                  <Input id="reference" name="reference" placeholder="e.g. eFPS / GCash Ref No." />
                </div>

                <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white mt-4">Log Tax Payment</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: DATA */}
        <div className="md:col-span-2 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="shadow-sm border-neutral-200">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Filtered Taxes Paid</p>
                <p className="text-3xl font-bold text-neutral-900 mt-2">
                  ₱{totalTaxesPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* SEARCH & FILTER BAR */}
          <Card className="shadow-sm border-neutral-200 bg-white">
            <CardContent className="p-4">
              <form method="GET" className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                  <Label className="text-xs text-neutral-500">Search Form</Label>
                  <Input name="search" placeholder="Search form or ref..." defaultValue={params?.search} />
                </div>
                <div className="w-full md:w-36 space-y-1">
                  <Label className="text-xs text-neutral-500">From Date</Label>
                  <Input type="date" name="from" defaultValue={params?.from} />
                </div>
                <div className="w-full md:w-36 space-y-1">
                  <Label className="text-xs text-neutral-500">To Date</Label>
                  <Input type="date" name="to" defaultValue={params?.to} />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Button type="submit" className="bg-neutral-900 text-white">Filter</Button>
                  {(params?.search || params?.from || params?.to) && (
                    <Link href="/taxes"><Button variant="outline" className="text-neutral-500">Clear</Button></Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* HISTORY TABLE */}
          <Card className="shadow-sm border-neutral-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[500px]">
                  <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 font-medium text-neutral-900">Date</th>
                      <th className="px-4 py-3 font-medium text-neutral-900">Form / Details</th>
                      <th className="px-4 py-3 font-medium text-neutral-900 text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-neutral-900 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {(!taxHistory || taxHistory.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">No tax payments found.</td>
                      </tr>
                    ) : (
                      taxHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-neutral-50 group transition-colors">
                          <td className="px-4 py-4 text-neutral-500">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-neutral-900">{record.description}</p>
                            {record.reference_number && <p className="text-xs text-neutral-400 font-mono mt-0.5">Ref: {record.reference_number}</p>}
                          </td>
                          <td className="px-4 py-4 font-bold text-red-600 text-right">
                            -₱{Number(record.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              
                              <Link href={`/taxes/${record.id}/edit`}>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50">Edit</Button>
                              </Link>

                              {isOwner && (
                                <form action={async (formData) => {
                                  "use server";
                                  await deleteTaxPayment(formData);
                                }}>
                                  <input type="hidden" name="id" value={record.id} />
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