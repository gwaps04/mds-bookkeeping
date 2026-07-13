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
import { Lock } from "lucide-react"; 

import { getTenantAccessLevel } from "@/lib/subscription";
import SubmitButton from "@/components/SubmitButton";

export default async function TaxesPage(props: { searchParams: Promise<{ search?: string, from?: string, to?: string }> }) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ============================================================================
  // 1. THE GATEKEEPER: Fetching the NEW Tax RBAC Flag
  // ============================================================================
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      business_id, 
      role, 
      can_access_taxes,
      businesses(is_tax_registered, tax_id, subscription_status, subscription_tier, trial_ends_at)
    `)
    .eq("id", user.id)
    .single();
    
  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  
  // ============================================================================
  // THE HARD GUARD: SERVER-SIDE ROUTE PROTECTION
  // ============================================================================
  const isSuperAdmin = profile?.role === 'super_admin';
  const isOwner = profile?.role === 'business_owner' || isSuperAdmin;
  
  // Key 1: If the Business hasn't enabled the Tax module in settings, kick everyone out.
  if (!bizData?.is_tax_registered && !isSuperAdmin) {
    redirect("/settings");
  }

  // Key 2: THE FIX - Now checking the explicit `can_access_taxes` flag!
  if (!isOwner && profile?.can_access_taxes !== true) {
    redirect("/dashboard");
  }
  // ============================================================================

  const accessState = getTenantAccessLevel(bizData);
  const isLocked = accessState.isLocked; 

  // 3. Fetch Asset Accounts
  const { data: bankAccounts } = await supabase.from("accounts").select("id, name, account_number").eq("business_id", businessId).eq("type", "asset").order("name");

  // 4. Fetch the ID for "Taxes, Licenses & Fees"
  const { data: taxCategory } = await supabase.from("accounts").select("id").eq("business_id", businessId).eq("name", "Taxes, Licenses & Fees").single();

  // 5. BUILD THE SEARCH & FILTER QUERY FOR TAXES
  let query = supabase
    .from("expenses")
    .select(`id, amount, date, description, reference_number, accounts!expenses_account_id_fkey(name)`)
    .eq("business_id", businessId)
    .order("date", { ascending: false });

  if (taxCategory) {
    query = query.eq("category_id", taxCategory.id);
  } else {
    query = query.eq("category_id", "00000000-0000-0000-0000-000000000000"); 
  }

  if (params?.search) query = query.ilike("description", `%${params.search}%`);
  if (params?.from) query = query.gte("date", params.from);
  if (params?.to) query = query.lte("date", params.to);

  const { data: taxHistory } = await query;
  const totalTaxesPaid = (taxHistory || []).reduce((sum, record) => sum + Number(record.amount), 0);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full min-w-0 overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 w-full min-w-0">
        <div className="w-full">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">BIR Tax Tracker</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Log and monitor your official tax remittances.</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg flex items-center gap-3 w-full sm:w-auto shrink-0 shadow-sm">
          <span className="text-xs sm:text-sm font-medium text-blue-800">Registered TIN:</span>
          <span className="font-mono font-bold text-blue-900 tracking-wider text-sm sm:text-base">{bizData?.tax_id || 'NOT SET'}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-start w-full min-w-0">
        
        {/* LOG PAYMENT FORM */}
        <div className="lg:col-span-1 w-full min-w-0">
          <Card className="shadow-sm border-neutral-200 lg:sticky lg:top-8 bg-white w-full min-w-0">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
              <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">Record Tax Payment</CardTitle>
              <CardDescription>Log statutory remittances to the BIR.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form action={async (formData) => {
                "use server";
                await logTaxPayment(formData);
              }} className="space-y-4 w-full">
                
                <div className="space-y-1.5 w-full">
                  <Label htmlFor="form_type" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">BIR Form Type</Label>
                  <Select name="form_type" required disabled={isLocked}>
                    <SelectTrigger className="w-full focus:ring-blue-600 font-bold"><SelectValue placeholder="Select BIR form..." /></SelectTrigger>
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

                <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                  <div className="space-y-1.5 w-full">
                    <Label htmlFor="amount" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Amount (₱)</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required disabled={isLocked} className="w-full focus-visible:ring-blue-600 font-black text-rose-600" />
                  </div>
                  <div className="space-y-1.5 w-full">
                    <Label htmlFor="date" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Date Paid</Label>
                    <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} disabled={isLocked} className="w-full focus-visible:ring-blue-600" />
                  </div>
                </div>

                <div className="space-y-1.5 w-full">
                  <Label htmlFor="account_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Paid From (Bank / Cash)</Label>
                  <Select name="account_id" required disabled={isLocked}>
                    <SelectTrigger className="w-full focus:ring-blue-600"><SelectValue placeholder="Select account..." /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 w-full pb-2">
                  <Label htmlFor="reference" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Reference No. (Optional)</Label>
                  <Input id="reference" name="reference" placeholder="e.g. eFPS / GCash Ref No." disabled={isLocked} className="w-full focus-visible:ring-blue-600 font-mono" />
                </div>

                <div className="pt-2 border-t border-neutral-100 w-full">
                  {isLocked ? (
                    <Button disabled type="button" className="w-full bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-none font-medium flex items-center justify-center gap-2 h-11 md:h-10">
                      <Lock size={16} /> Creation Locked
                    </Button>
                  ) : (
                    <SubmitButton 
                      title="Log Tax Payment" 
                      loadingTitle="Logging..." 
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold h-11 md:h-10 shadow-sm transition-all" 
                    />
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: DATA */}
        <div className="lg:col-span-2 space-y-4 w-full min-w-0">
          
          <div className="grid grid-cols-1 gap-4 w-full min-w-0">
            <Card className="shadow-sm border-neutral-200 bg-white">
              <CardContent className="p-4 md:p-6 flex flex-col justify-center items-center sm:items-start text-center sm:text-left h-full">
                <p className="text-[10px] sm:text-xs font-bold text-neutral-500 uppercase tracking-wider">Filtered Taxes Paid</p>
                <p className="text-3xl sm:text-4xl font-black text-rose-600 mt-2 tracking-tight break-words w-full">
                  ₱{totalTaxesPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* SEARCH & FILTER BAR */}
          <Card className="shadow-sm border-neutral-200 bg-white w-full min-w-0">
            <CardContent className="p-4 md:p-5">
              <form method="GET" className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-end w-full">
                <div className="flex-1 w-full min-w-[200px] space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Search Form</Label>
                  <Input name="search" placeholder="Search form or ref..." defaultValue={params?.search} className="bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900 w-full" />
                </div>
                <div className="w-full sm:w-auto min-w-[130px] space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">From Date</Label>
                  <Input type="date" name="from" defaultValue={params?.from} className="bg-neutral-50 border-neutral-200 w-full" />
                </div>
                <div className="w-full sm:w-auto min-w-[130px] space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">To Date</Label>
                  <Input type="date" name="to" defaultValue={params?.to} className="bg-neutral-50 border-neutral-200 w-full" />
                </div>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <Button type="submit" className="bg-neutral-900 text-white flex-1 sm:flex-none shadow-sm transition-all hover:bg-neutral-800">Filter</Button>
                  {(params?.search || params?.from || params?.to) && (
                    <Link href="/taxes" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button>
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* HISTORY TABLE */}
          <Card className="shadow-sm border-neutral-200 flex flex-col bg-white overflow-hidden w-full min-w-0">
            <CardContent className="p-0 flex-1 w-full overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm table-auto">
                  <thead className="bg-neutral-50/80 border-b border-t border-neutral-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap w-auto">Date</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] w-full">Form / Details</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap w-auto">Amount</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-center whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {(!taxHistory || taxHistory.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-16 text-center text-neutral-500">No tax payments found.</td>
                      </tr>
                    ) : (
                      taxHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-neutral-50/60 group transition-colors">
                          <td className="px-4 sm:px-6 py-4 text-neutral-500 font-medium whitespace-nowrap text-xs sm:text-sm align-top sm:align-middle">
                            {new Date(record.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-normal break-words w-full min-w-[150px] align-middle">
                            <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-sm mb-1 border border-blue-200">
                              {record.description.split(' - ')[0] || 'BIR Form'}
                            </span>
                            <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight mt-1">{record.description}</p>
                            {record.reference_number && <p className="text-[11px] sm:text-xs text-neutral-400 font-mono mt-1 break-all">Ref: {record.reference_number}</p>}
                          </td>
                          <td className="px-4 sm:px-6 py-4 font-black text-rose-600 text-right align-top sm:align-middle whitespace-nowrap text-sm sm:text-base">
                            -₱{Number(record.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center align-middle whitespace-nowrap">
                            
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                              
                              {isLocked ? (
                                <Button disabled variant="outline" size="sm" className="w-full sm:w-auto h-8 sm:h-9 px-3 text-xs bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed font-bold">
                                  <Lock size={10} className="mr-1.5" /> Edit
                                </Button>
                              ) : (
                                <Link href={`/taxes/${record.id}/edit`} className="w-full sm:w-auto">
                                  <Button variant="outline" size="sm" className="w-full h-8 sm:h-9 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors font-bold shadow-sm">Edit</Button>
                                </Link>
                              )}

                              {isOwner && !isLocked && (
                                <form action={async (formData) => {
                                  "use server";
                                  await deleteTaxPayment(formData);
                                }} className="w-full sm:w-auto">
                                  <input type="hidden" name="id" value={record.id} />
                                  <Button type="submit" variant="destructive" size="sm" className="w-full h-8 sm:h-9 px-3 text-xs font-bold shadow-sm">Delete</Button>
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