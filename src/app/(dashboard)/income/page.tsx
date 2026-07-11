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
import { Lock, Banknote } from "lucide-react"; 

import { IncomeEditInterceptor, IncomeDeleteDialog } from "./IncomeActionDialogs";
import { getTenantAccessLevel } from "@/lib/subscription";

import TablePagination from "@/components/TablePagination"; 

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function IncomePage(props: { 
  searchParams: Promise<{ search?: string, from?: string, to?: string, month?: string, year?: string, page?: string }> 
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

  // PAGINATION SETUP
  const ITEMS_PER_PAGE = 50;
  const currentPage = parseInt(params?.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const { data: business } = await supabase
    .from("businesses")
    .select("subscription_status, subscription_tier, trial_ends_at")
    .eq("id", profile?.business_id)
    .single();

  const accessState = getTenantAccessLevel(business);
  const isLocked = accessState.isLocked;

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("business_id", profile?.business_id)
    .in("type", ["asset", "revenue", "equity"]) 
    .order("name");

  const bankAccounts = accounts?.filter(a => a.type === "asset") || [];
  const revenueCategories = accounts?.filter(a => a.type === "revenue" || a.type === "equity") || []; 

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

  // ============================================================================
  // DATABASE-LEVEL FILTERING WITH PAGINATION LIMITS
  // ============================================================================
  let query = supabase
    .from("income")
    .select(`
      *,
      customers (name),
      accounts!income_category_id_fkey (name, type) 
    `, { count: 'exact' }) 
    .eq("business_id", profile?.business_id)
    .order("date", { ascending: false });

  if (params?.search) {
    query = query.ilike("description", `%${params.search}%`); 
  }
  
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  query = query.range(from, to);

  const { data: incomeRecords, count } = await query;
  const totalItems = count || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full min-w-0 overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="w-full min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Income & Sales</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Record instant cash receipts, retail sales, and capital injections.</p>
        </div>
      </div>

      {/* THE FIX 1: Add min-w-0 to the master grid and its columns to prevent Grid Blowout! */}
      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-start w-full min-w-0">
        
        {/* LEFT COLUMN: CREATION FORM */}
        <div className="lg:col-span-1 w-full min-w-0">
          <Card className="shadow-sm border-neutral-200 lg:sticky lg:top-8 bg-white w-full min-w-0">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
              <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Banknote size={18} className="text-green-600" /> Record Cash Receipt
              </CardTitle>
              <CardDescription>Log money entering the business.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form action={async (formData) => {
                "use server";
                await createIncome(formData);
              }} className="space-y-4 w-full">
                
                <div className="space-y-1.5 w-full">
                  <Label htmlFor="customer_name" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Customer / Entity</Label>
                  <Input id="customer_name" name="customer_name" placeholder="e.g. Walk-in, Business Owner" required disabled={isLocked} className="w-full focus-visible:ring-green-600" />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                  <div className="space-y-1.5 w-full">
                    <Label htmlFor="amount" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Amount</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required disabled={isLocked} className="w-full focus-visible:ring-green-600" />
                  </div>
                  <div className="space-y-1.5 w-full">
                    <Label htmlFor="date" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Date</Label>
                    <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required disabled={isLocked} className="w-full focus-visible:ring-green-600" />
                  </div>
                </div>

                <div className="space-y-1.5 w-full">
                  <Label htmlFor="category_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Category</Label>
                  <Select name="category_id" required disabled={isLocked}>
                    <SelectTrigger className="w-full focus:ring-green-600">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px] w-full">
                      {revenueCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 w-full">
                  <Label htmlFor="account_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Deposit To (Bank)</Label>
                  <Select name="account_id" required disabled={isLocked}>
                    <SelectTrigger className="w-full focus:ring-green-600">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px] w-full">
                      {bankAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 w-full">
                  <Label htmlFor="reference_number" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Ref No. (Optional)</Label>
                  <Input id="reference_number" name="reference_number" placeholder="e.g. GCash Ref, Check No." disabled={isLocked} className="w-full focus-visible:ring-green-600" />
                </div>

                <div className="space-y-1.5 w-full">
                  <Label htmlFor="description" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Notes (Optional)</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Provide details about this transaction..." 
                    className="w-full resize-none h-16 focus-visible:ring-green-600"
                    disabled={isLocked}
                  />
                </div>

                <div className="pt-2 w-full">
                  {isLocked ? (
                    <Button disabled type="button" className="w-full bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-none font-medium flex items-center justify-center gap-2 h-11 md:h-10">
                      <Lock size={16} /> Creation Locked
                    </Button>
                  ) : (
                    <SubmitButton 
                      title="Record Income" 
                      loadingTitle="Saving Record..." 
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold transition-all h-11 md:h-10 shadow-sm" 
                    />
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: TABLE & FILTERS */}
        <div className="lg:col-span-2 space-y-4 w-full min-w-0">
          
          <Card className="shadow-sm border-neutral-200 bg-white w-full min-w-0">
            <CardContent className="p-4 md:p-5">
              <form method="GET" className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-end w-full">
                
                <input type="hidden" name="page" value="1" />

                <div className="flex-1 w-full min-w-[200px] space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Search Notes</Label>
                  <Input name="search" placeholder="Search description..." defaultValue={params?.search} className="bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900 w-full" />
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
                  {(params?.search || params?.from || params?.to || params?.month || params?.year) && (
                    <Link href="/income" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button>
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* INCOME LEDGER - FLUID OPTIMIZED */}
          <Card className="shadow-sm border-neutral-200 flex flex-col bg-white overflow-hidden w-full min-w-0">
            <CardContent className="p-0 flex-1 w-full overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm table-auto">
                  <thead className="bg-neutral-50/80 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap w-auto">Date</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] w-full">Entity & Notes</th>
                      <th className="hidden sm:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Category</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap w-auto">Amount</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-center whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {(!incomeRecords || incomeRecords.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-neutral-500">
                          No income records found for this period.
                        </td>
                      </tr>
                    ) : (
                      (incomeRecords as any[]).map((inc) => {
                        const clientName = inc.customers?.name || 'Walk-in';
                        const isEquity = inc.accounts?.type === 'equity'; 
                        
                        const categoryBadge = (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                            isEquity ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-green-50 text-green-700 border-green-200'
                          }`}>
                            {inc.accounts?.name || 'Uncategorized'}
                          </span>
                        );

                        return (
                          <tr key={inc.id} className="hover:bg-neutral-50/60 transition-colors group">
                            
                            <td className="px-4 sm:px-6 py-4 text-neutral-500 font-medium whitespace-nowrap text-xs sm:text-sm align-top sm:align-middle">
                              {new Date(inc.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 whitespace-normal break-words w-full min-w-[150px] align-middle">
                              <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight">{clientName}</p>
                              <p className="text-[11px] sm:text-xs text-neutral-500 mt-1 line-clamp-2">{inc.description}</p>
                              
                              {inc.reference_number && (
                                <p className="text-[10px] text-neutral-400 font-mono mt-1 break-all">Ref: {inc.reference_number}</p>
                              )}

                              <div className="mt-2 sm:hidden">
                                {categoryBadge}
                              </div>
                            </td>
                            
                            <td className="hidden sm:table-cell px-4 sm:px-6 py-4 align-middle whitespace-nowrap">
                              {categoryBadge}
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 text-right align-top sm:align-middle whitespace-nowrap">
                              <div className={`font-black text-sm sm:text-base ${isEquity ? 'text-purple-600' : 'text-green-600'}`}>
                                +{formatCurrency(Number(inc.amount))}
                              </div>
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 text-center align-middle whitespace-nowrap">
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                {isLocked ? (
                                  <Button disabled variant="outline" size="sm" className="w-full sm:w-auto h-8 sm:h-9 px-3 text-xs bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed font-bold">
                                    <Lock size={10} className="mr-1.5" /> Edit
                                  </Button>
                                ) : (
                                  <div className="w-full sm:w-auto">
                                    <IncomeEditInterceptor targetUrl={`/income/${inc.id}/edit`} />
                                  </div>
                                )}
                                
                                {isOwner && !isLocked && (
                                  <div className="w-full sm:w-auto">
                                    <IncomeDeleteDialog incomeId={inc.id} amount={inc.amount} clientName={clientName} />
                                  </div>
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
            </CardContent>

            <TablePagination 
              totalItems={totalItems} 
              itemsPerPage={ITEMS_PER_PAGE} 
              currentPage={currentPage} 
            />
          </Card>
        </div>
      </div>
    </div>
  );
}