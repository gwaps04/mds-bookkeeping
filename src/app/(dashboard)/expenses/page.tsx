// src/app/(dashboard)/expenses/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createExpense } from "@/features/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { Paperclip, Lock, CreditCard } from "lucide-react"; 

import { ExpenseEditInterceptor, ExpenseDeleteDialog } from "./ExpenseActionDialogs";
import { getTenantAccessLevel } from "@/lib/subscription";
import TablePagination from "@/components/TablePagination"; 

// THE FIX: Import the new Client Component
import ReceiptInput from "./ReceiptInput";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExpensesPage(props: { 
  searchParams: Promise<{ search?: string, from?: string, to?: string, month?: string, year?: string, page?: string }> 
}) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ============================================================================
  // THE GATEKEEPER: Get Profile, RBAC Flags & Business Features
  // ============================================================================
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      business_id, 
      role, 
      can_access_expenses,
      businesses(currency, allow_receipt_uploads)
    `) 
    .eq("id", user.id)
    .single();

  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";
  
  // ============================================================================
  // THE HARD GUARD: SERVER-SIDE ROUTE PROTECTION
  // ============================================================================
  const isSuperAdmin = profile?.role === 'super_admin';
  const isOwner = profile?.role === 'business_owner' || isSuperAdmin;
  
  if (!isOwner && profile?.can_access_expenses !== true) {
    redirect("/dashboard");
  }
  // ============================================================================
  
  const canUploadReceipts = bizData?.allow_receipt_uploads !== false; 

  // PAGINATION SETUP
  const ITEMS_PER_PAGE = 50;
  const currentPage = parseInt(params?.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // ============================================================================
  // 1. THE SAAS SUBSCRIPTION ENGINE
  // ============================================================================
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
    .in("type", ["asset", "expense", "liability"]) 
    .order("name");

  const bankAccounts = accounts?.filter(a => a.type === "asset" || a.type === "liability") || [];
  const expenseCategories = accounts?.filter(a => a.type === "expense") || [];

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
    .from("expenses")
    .select(`
      *,
      vendors (name),
      accounts!expenses_category_id_fkey (name)
    `, { count: 'exact' })
    .eq("business_id", profile?.business_id)
    .order("date", { ascending: false });

  if (params?.search) query = query.ilike("description", `%${params.search}%`);
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  query = query.range(from, to);

  const { data: expenseRecords, count } = await query;
  const totalItems = count || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full min-w-0 overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 w-full min-w-0">
        <div className="w-full">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Expenses</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Record and manage business outflows, bills, and purchases.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-start w-full min-w-0">
        
        {/* LEFT COLUMN: CREATE EXPENSE FORM */}
        <div className="lg:col-span-1 w-full min-w-0">
          <Card className="shadow-sm border-neutral-200 lg:sticky lg:top-8 bg-white w-full min-w-0">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
              <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <CreditCard size={18} className="text-neutral-500" /> Record Expense
              </CardTitle>
              <CardDescription>Log money leaving the business.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form action={async (formData) => {
                "use server";
                await createExpense(formData);
              }} className="space-y-4 w-full">
                
                <div className="space-y-1.5 w-full">
                  <Label htmlFor="vendor_name" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Vendor / Payee</Label>
                  <Input id="vendor_name" name="vendor_name" placeholder="e.g. Meralco, Office Warehouse" required disabled={isLocked} className="w-full focus-visible:ring-neutral-900" />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full">
                  <div className="space-y-1.5 w-full">
                    <Label htmlFor="amount" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Amount</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required disabled={isLocked} className="w-full focus-visible:ring-neutral-900" />
                  </div>
                  <div className="space-y-1.5 w-full">
                    <Label htmlFor="date" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Date</Label>
                    <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required disabled={isLocked} className="w-full focus-visible:ring-neutral-900" />
                  </div>
                </div>

                <div className="space-y-1.5 w-full">
                  <Label htmlFor="category_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Expense Category</Label>
                  <Select name="category_id" required disabled={isLocked}>
                    <SelectTrigger className="w-full focus:ring-neutral-900">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px] w-full">
                      {expenseCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 w-full">
                  <Label htmlFor="account_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Paid From (Bank / Cash)</Label>
                  <Select name="account_id" required disabled={isLocked}>
                    <SelectTrigger className="w-full focus:ring-neutral-900">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px] w-full">
                      {bankAccounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 w-full">
                  <Label htmlFor="reference_number" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Ref No. (Optional)</Label>
                  <Input id="reference_number" name="reference_number" placeholder="e.g. Receipt No." disabled={isLocked} className="w-full focus-visible:ring-neutral-900" />
                </div>

                <div className="space-y-1.5 w-full mb-2">
                  <Label htmlFor="description" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Notes / Details</Label>
                  <Textarea id="description" name="description" placeholder="What was this for?" className="w-full resize-none h-16 focus-visible:ring-neutral-900" required disabled={isLocked} />
                </div>

                {/* THE FIX: Replaced massive inline conditional with clean Client Component */}
                <ReceiptInput isLocked={isLocked || !canUploadReceipts} />

                <div className="pt-2 w-full">
                  {isLocked ? (
                    <Button disabled type="button" className="w-full bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-none font-medium flex items-center justify-center gap-2 h-11 md:h-10">
                      <Lock size={16} /> Creation Locked
                    </Button>
                  ) : (
                    <SubmitButton 
                      title="Record Expense" 
                      loadingTitle="Recording..." 
                      className="w-full bg-neutral-900 text-white hover:bg-neutral-800 transition-all font-bold h-11 md:h-10 shadow-sm" 
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
                    <Link href="/expenses" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button>
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* EXPENSE LEDGER */}
          <Card className="shadow-sm border-neutral-200 flex flex-col bg-white overflow-hidden w-full min-w-0">
            <CardContent className="p-0 flex-1 w-full overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm table-auto">
                  <thead className="bg-neutral-50/80 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap w-auto">Date</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] w-full">Vendor & Notes</th>
                      <th className="hidden sm:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Category</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap w-auto">Amount</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-center whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {(!expenseRecords || expenseRecords.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-neutral-500">
                          No expense records found for this period.
                        </td>
                      </tr>
                    ) : (
                      (expenseRecords as any[]).map((exp) => {
                        const vendorName = exp.vendors?.name || 'Unknown Vendor';
                        
                        const categoryBadge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border shadow-sm bg-neutral-100 text-neutral-700 border-neutral-200">
                            {exp.accounts?.name || 'Uncategorized'}
                          </span>
                        );

                        return (
                          <tr key={exp.id} className="hover:bg-neutral-50/60 transition-colors group">
                            
                            <td className="px-4 sm:px-6 py-4 text-neutral-500 font-medium whitespace-nowrap text-xs sm:text-sm align-top sm:align-middle">
                              {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 whitespace-normal break-words w-full min-w-[150px] align-middle">
                              <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight">{vendorName}</p>
                              <p className="text-[11px] sm:text-xs text-neutral-500 mt-1 line-clamp-2">{exp.description}</p>
                              
                              <div className="mt-2 sm:hidden">
                                {categoryBadge}
                              </div>

                              {exp.receipt_url && (
                                <div className="mt-2.5">
                                  <a 
                                    href={exp.receipt_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                                  >
                                    <Paperclip size={12} className="shrink-0" /> View Doc
                                  </a>
                                </div>
                              )}
                            </td>
                            
                            <td className="hidden sm:table-cell px-4 sm:px-6 py-4 align-middle whitespace-nowrap">
                              {categoryBadge}
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 text-right align-top sm:align-middle whitespace-nowrap">
                              <div className="font-black text-neutral-900 text-sm sm:text-base">
                                -{formatCurrency(Number(exp.amount))}
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
                                    <ExpenseEditInterceptor targetUrl={`/expenses/${exp.id}/edit`} />
                                  </div>
                                )}
                                
                                {isOwner && !isLocked && (
                                  <div className="w-full sm:w-auto">
                                    <ExpenseDeleteDialog 
                                      expenseId={exp.id} 
                                      amount={exp.amount} 
                                      vendorName={vendorName} 
                                    />
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