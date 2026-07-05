// src/app/(dashboard)/income/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createIncome } from "@/features/income/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";

// Importing our custom Security Gates!
import { IncomeEditInterceptor, IncomeDeleteDialog } from "./IncomeActionDialogs";

export default async function IncomePage(props: { 
  searchParams: Promise<{ search?: string, from?: string, to?: string, month?: string, year?: string }> 
}) {
  const params = await props.searchParams;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role, businesses(business_name, currency)")
    .eq("id", user?.id)
    .single();

  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";
  
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("business_id", profile?.business_id)
    .in("type", ["asset", "revenue"]) 
    .order("name");

  const bankAccounts = accounts?.filter(a => a.type === "asset") || [];
  const revenueCategories = accounts?.filter(a => a.type === "revenue") || [];

  let startDate = params?.from || null;
  let endDate = params?.to || null;

  if (!startDate && !endDate && params?.year) {
    const yearStr = params.year;
    
    if (params?.month && params.month !== 'all') {
      const monthStr = params.month.padStart(2, '0');
      const lastDay = new Date(Number(yearStr), Number(params.month), 0).getDate();
      
      startDate = `${yearStr}-${monthStr}-01`;
      endDate = `${yearStr}-${monthStr}-${lastDay}T23:59:59.999`;
    } else {
      startDate = `${yearStr}-01-01`;
      endDate = `${yearStr}-12-31T23:59:59.999`;
    }
  }

  let query = supabase
    .from("income")
    .select(`
      *,
      customers (name),
      accounts!income_category_id_fkey (name)
    `)
    .eq("business_id", profile?.business_id)
    .order("date", { ascending: false });

  if (params?.search) {
    query = query.ilike("description", `%${params.search}%`); 
  }
  
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  const { data: incomeRecords } = await query;

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
        
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200 sticky top-8">
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
                    <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                  </div>
                </div>

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

                <SubmitButton 
                  title="Record Income" 
                  loadingTitle="Saving Record..." 
                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                />
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          
          <Card className="shadow-sm border-neutral-200 bg-white">
            <CardContent className="p-4">
              <form method="GET" className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                  <Label className="text-xs text-neutral-500">Search Notes</Label>
                  <Input name="search" placeholder="Search description..." defaultValue={params?.search} />
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
                  
                  {(params?.search || params?.from || params?.to || params?.month || params?.year) && (
                    <Link href="/income">
                      <Button variant="outline" className="text-neutral-500">Clear</Button>
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-4 font-medium text-neutral-900">Date</th>
                  <th className="px-4 py-4 font-medium text-neutral-900">Customer & Notes</th>
                  <th className="px-4 py-4 font-medium text-neutral-900">Category</th>
                  <th className="px-4 py-4 font-medium text-neutral-900 text-right">Amount</th>
                  <th className="px-4 py-4 font-medium text-neutral-900 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {(!incomeRecords || incomeRecords.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                      No income records found for this period.
                    </td>
                  </tr>
                ) : (
                  (incomeRecords as any[]).map((inc) => {
                    const clientName = inc.customers?.name || 'Walk-in';
                    
                    return (
                      <tr key={inc.id} className="hover:bg-neutral-50 group transition-colors">
                        <td className="px-4 py-4 text-neutral-500">
                          {new Date(inc.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-neutral-900">{clientName}</p>
                          <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[200px]">{inc.description}</p>
                          {inc.reference_number && (
                            <span className="block text-xs text-neutral-400 font-mono mt-0.5">Ref: {inc.reference_number}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-neutral-600">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            {inc.accounts?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-green-600">
                          +{formatCurrency(Number(inc.amount))}
                        </td>
                        <td className="px-4 py-4 text-center">
                          
                          <div className="flex items-center justify-center gap-2">
                            
                            {/* Injecting the Secure Edit Interceptor */}
                            <IncomeEditInterceptor targetUrl={`/income/${inc.id}/edit`} />

                            {/* Injecting the Secure Delete Dialog */}
                            {isOwner && (
                              <IncomeDeleteDialog 
                                incomeId={inc.id} 
                                amount={inc.amount} 
                                clientName={clientName} 
                              />
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}