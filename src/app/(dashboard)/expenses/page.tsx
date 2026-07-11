// src/app/(dashboard)/expenses/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createExpense } from "@/features/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { Paperclip, Camera, Upload, Lock } from "lucide-react"; 

import { ExpenseEditInterceptor, ExpenseDeleteDialog } from "./ExpenseActionDialogs";
import { getTenantAccessLevel } from "@/lib/subscription";

// THE FIX 1: Import Universal Pagination Component
import TablePagination from "@/components/TablePagination"; 

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExpensesPage(props: { 
  // THE FIX 2: Added "page" to the Search Params
  searchParams: Promise<{ search?: string, from?: string, to?: string, month?: string, year?: string, page?: string }> 
}) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role, businesses(currency, allow_receipt_uploads)") 
    .eq("id", user?.id)
    .single();

  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';
  
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
  const isLocked = accessState.isLocked; // <-- The Master UI Gate
  // ============================================================================

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
  // THE FIX 3: DATABASE-LEVEL FILTERING WITH PAGINATION LIMITS
  // Notice { count: 'exact' } is applied!
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

  // Apply Pagination Database Limits
  query = query.range(from, to);

  const { data: expenseRecords, count } = await query;
  const totalItems = count || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">Expenses</h2>
        <p className="text-sm md:text-base text-neutral-500 mt-1">Record and manage business outflows, bills, and purchases.</p>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-start">
        
        {/* CREATE EXPENSE FORM */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm border-neutral-200 lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle className="text-lg">Record Expense</CardTitle>
              <CardDescription>Log money leaving the business.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                "use server";
                await createExpense(formData);
              }} className="space-y-4">
                
                <div className="space-y-2">
                  <Label htmlFor="vendor_name">Vendor / Payee</Label>
                  <Input id="vendor_name" name="vendor_name" placeholder="e.g. Meralco, Office Warehouse" required disabled={isLocked} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required disabled={isLocked} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required disabled={isLocked} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id">Expense Category</Label>
                  <Select name="category_id" required disabled={isLocked}>
                    <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {expenseCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_id">Paid From (Bank / Cash)</Label>
                  <Select name="account_id" required disabled={isLocked}>
                    <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {bankAccounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_number">Reference No. (Optional)</Label>
                  <Input id="reference_number" name="reference_number" placeholder="e.g. Receipt No." disabled={isLocked} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Notes / Details</Label>
                  <Textarea id="description" name="description" placeholder="What was this for?" className="resize-none h-16" required disabled={isLocked} />
                </div>

                {canUploadReceipts ? (
                  <div className={`space-y-3 p-4 rounded-lg border-2 border-dashed relative group overflow-hidden transition-colors ${isLocked ? 'bg-neutral-50 border-neutral-200' : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 hover:border-blue-300'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`flex items-center gap-1.5 px-2 py-1 bg-white border rounded shadow-sm ${isLocked ? 'text-neutral-400 border-neutral-200' : 'text-blue-600 border-blue-200'}`}>
                        <Camera size={14} className="md:hidden" />
                        <Upload size={14} className="hidden md:block" />
                        <span className="text-[10px] font-bold uppercase tracking-wider md:hidden">Scanner</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">Upload</span>
                      </div>
                      <Label htmlFor="receipt" className={`font-semibold ${isLocked ? 'text-neutral-400' : 'text-neutral-700 cursor-pointer'}`}>
                        Attach Receipt (Optional)
                      </Label>
                    </div>
                    
                    <p className="text-[11px] text-neutral-500 leading-relaxed mb-3 md:hidden">
                      Tap the button below to open your camera and scan a receipt.
                    </p>
                    <p className="text-[11px] text-neutral-500 leading-relaxed mb-3 hidden md:block">
                      Click below to select a scanned image or PDF from your computer.
                    </p>
                    
                    <Input 
                      id="receipt" 
                      name="receipt" 
                      type="file" 
                      accept="image/jpeg, image/png, application/pdf" 
                      disabled={isLocked}
                      className={`file:font-semibold file:bg-white file:border file:rounded-md file:px-4 file:py-1.5 file:mr-4 file:transition-colors file:shadow-sm text-xs bg-transparent border-0 p-0 h-auto w-full ${isLocked ? 'cursor-not-allowed file:text-neutral-400 file:border-neutral-200 text-neutral-400' : 'cursor-pointer file:text-blue-700 file:border-blue-200 file:hover:bg-blue-50 text-neutral-500'}`} 
                    />
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200 relative overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-0 right-0 p-3 opacity-5 text-4xl pointer-events-none">🔒</div>
                    <div className="p-2 bg-neutral-200 text-neutral-500 rounded-full mb-1">
                      <Camera size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-900">Receipt Scanning Locked</h4>
                      <p className="text-[11px] text-neutral-500 leading-relaxed mt-1 max-w-[200px] mx-auto">
                        Digital document storage and mobile scanning are available on Premium plans.
                      </p>
                    </div>
                    <Button type="button" disabled variant="outline" size="sm" className="h-7 text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50 mt-1 cursor-not-allowed">
                      Upgrade to Unlock
                    </Button>
                  </div>
                )}

                {/* THE FIX: THE UI MUTATION GATE APPLIED TO THE MAIN CTA */}
                {isLocked ? (
                  <Button disabled type="button" className="w-full bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-none font-medium flex items-center justify-center gap-2">
                    <Lock size={16} /> Creation Locked
                  </Button>
                ) : (
                  <SubmitButton 
                    title="Record Expense" 
                    loadingTitle="Recording..." 
                    className="w-full bg-neutral-900 text-white hover:bg-neutral-800 transition-all" 
                  />
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          
          <Card className="shadow-sm border-neutral-200 bg-white">
            <CardContent className="p-4">
              <form method="GET" className="flex flex-col xl:flex-row gap-3 xl:items-end">
                
                {/* THE FIX 4: Reset Page to 1 when a new filter is executed! */}
                <input type="hidden" name="page" value="1" />

                <div className="flex-1 w-full space-y-1">
                  <Label className="text-xs text-neutral-500">Search Notes</Label>
                  <Input name="search" placeholder="Search description..." defaultValue={params?.search} />
                </div>
                <div className="grid grid-cols-2 gap-3 w-full xl:w-auto">
                  <div className="space-y-1">
                    <Label className="text-xs text-neutral-500">From Date</Label>
                    <Input type="date" name="from" defaultValue={params?.from} className="w-full xl:w-36" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-neutral-500">To Date</Label>
                    <Input type="date" name="to" defaultValue={params?.to} className="w-full xl:w-36" />
                  </div>
                </div>
                <div className="flex gap-2 w-full xl:w-auto mt-2 xl:mt-0">
                  <Button type="submit" className="bg-neutral-900 text-white flex-1 xl:flex-none">Filter</Button>
                  {(params?.search || params?.from || params?.to || params?.month || params?.year) && (
                    <Link href="/expenses" className="flex-1 xl:flex-none">
                      <Button variant="outline" className="text-neutral-500 w-full">Clear</Button>
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* THE FIX 5: Layout adjust for Pagination placement */}
          <Card className="shadow-sm border-neutral-200 flex flex-col bg-white">
            <CardContent className="p-0 flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-4 py-4 font-medium text-neutral-900">Date</th>
                      <th className="px-4 py-4 font-medium text-neutral-900">Vendor & Notes</th>
                      <th className="px-4 py-4 font-medium text-neutral-900">Category</th>
                      <th className="px-4 py-4 font-medium text-neutral-900 text-right">Amount</th>
                      <th className="px-4 py-4 font-medium text-neutral-900 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {(!expenseRecords || expenseRecords.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-16 text-center text-neutral-500">
                          No expense records found for this period.
                        </td>
                      </tr>
                    ) : (
                      (expenseRecords as any[]).map((exp) => {
                        const vendorName = exp.vendors?.name || 'Unknown Vendor';

                        return (
                          <tr key={exp.id} className="hover:bg-neutral-50 group transition-colors">
                            <td className="px-4 py-4 text-neutral-500">{new Date(exp.date).toLocaleDateString()}</td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-neutral-900">{vendorName}</p>
                              <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[150px] lg:max-w-[200px]">{exp.description}</p>
                              
                              {/* NOTE: Document viewing remains active even when locked! */}
                              {exp.receipt_url && (
                                <a 
                                  href={exp.receipt_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded text-[10px] font-medium transition-colors"
                                >
                                  <Paperclip size={10} /> View Document
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-4 text-neutral-600">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                                {exp.accounts?.name || 'Uncategorized'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-medium text-neutral-900">
                              -{formatCurrency(Number(exp.amount))}
                            </td>
                            <td className="px-4 py-4 text-center">
                              
                              <div className="flex items-center justify-center gap-2">
                                
                                {/* THE FIX: THE UI MUTATION GATE APPLIED TO ROW ACTIONS */}
                                {isLocked ? (
                                  <Button disabled variant="outline" size="sm" className="h-8 px-3 text-xs bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed">
                                    <Lock size={10} className="mr-1.5" /> Edit
                                  </Button>
                                ) : (
                                  <ExpenseEditInterceptor targetUrl={`/expenses/${exp.id}/edit`} />
                                )}
                                
                                {/* DELETE: Hidden entirely if locked to prevent visual clutter */}
                                {isOwner && !isLocked && (
                                  <ExpenseDeleteDialog 
                                    expenseId={exp.id} 
                                    amount={exp.amount} 
                                    vendorName={vendorName} 
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
            </CardContent>

            {/* THE FIX 6: Render the Universal Pagination UI */}
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