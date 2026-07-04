// src/app/(dashboard)/expenses/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createExpense, deleteExpense } from "@/features/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { Paperclip, Camera, Upload } from "lucide-react"; 

export default async function ExpensesPage(props: { 
  searchParams: Promise<{ search?: string, from?: string, to?: string, month?: string, year?: string }> 
}) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ============================================================================
  // 1. THE GATEKEEPER: Get Profile, Role & Business Features
  // ============================================================================
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role, businesses(currency, allow_receipt_uploads)") 
    .eq("id", user?.id)
    .single();

  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';
  
  // Evaluates to true UNLESS explicitly set to false by the Super Admin
  const canUploadReceipts = bizData?.allow_receipt_uploads !== false; 

  // 2. Fetch Accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("business_id", profile?.business_id)
    .in("type", ["asset", "expense"]) 
    .order("name");

  const bankAccounts = accounts?.filter(a => a.type === "asset") || [];
  const expenseCategories = accounts?.filter(a => a.type === "expense") || [];

  // ============================================================================
  // 3. THE TEMPORAL BRIDGE
  // ============================================================================
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
  // 4. BUILD DYNAMIC SEARCH & FILTER QUERY
  // ============================================================================
  let query = supabase
    .from("expenses")
    .select(`
      *,
      vendors (name),
      accounts!expenses_category_id_fkey (name)
    `)
    .eq("business_id", profile?.business_id)
    .order("date", { ascending: false });

  if (params?.search) query = query.ilike("description", `%${params.search}%`);
  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  const { data: expenseRecords } = await query;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">Expenses</h2>
        <p className="text-sm md:text-base text-neutral-500 mt-1">Record and manage business outflows, bills, and purchases.</p>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
        
        {/* CREATE FORM */}
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
                  <Input id="vendor_name" name="vendor_name" placeholder="e.g. Meralco, Office Warehouse" required />
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
                  <Label htmlFor="category_id">Expense Category</Label>
                  <Select name="category_id" required>
                    <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {expenseCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_id">Paid From (Bank / Cash)</Label>
                  <Select name="account_id" required>
                    <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {bankAccounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference_number">Reference No. (Optional)</Label>
                  <Input id="reference_number" name="reference_number" placeholder="e.g. Receipt No." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Notes / Details</Label>
                  <Textarea id="description" name="description" placeholder="What was this for?" className="resize-none h-16" required />
                </div>

                {/* ============================================================================ */}
                {/* THE SAAS FEATURE GATE: CONDITIONAL RENDER */}
                {/* ============================================================================ */}
                {canUploadReceipts ? (
                  <div className="space-y-3 p-4 bg-blue-50/50 rounded-lg border-2 border-blue-100 border-dashed relative group overflow-hidden transition-colors hover:bg-blue-50 hover:border-blue-300">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-blue-200 rounded text-blue-600 shadow-sm">
                        <Camera size={14} className="md:hidden" />
                        <Upload size={14} className="hidden md:block" />
                        <span className="text-[10px] font-bold uppercase tracking-wider md:hidden">Scanner</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">Upload</span>
                      </div>
                      <Label htmlFor="receipt" className="text-neutral-700 font-semibold cursor-pointer">
                        Attach Receipt (Optional)
                      </Label>
                    </div>
                    
                    <p className="text-[11px] text-neutral-500 leading-relaxed mb-3 md:hidden">
                      Tap the button below to open your camera and scan a receipt.
                    </p>
                    <p className="text-[11px] text-neutral-500 leading-relaxed mb-3 hidden md:block">
                      Click below to select a scanned image or PDF from your computer.
                    </p>
                    
                    {/* STRICT MIME TYPES: Only JPG, PNG, and PDF allowed */}
                    <Input 
                      id="receipt" 
                      name="receipt" 
                      type="file" 
                      accept="image/jpeg, image/png, application/pdf" 
                      className="cursor-pointer file:text-blue-700 file:font-semibold file:bg-white file:border file:border-blue-200 file:rounded-md file:px-4 file:py-1.5 file:mr-4 file:hover:bg-blue-50 file:transition-colors file:shadow-sm text-neutral-500 text-xs bg-transparent border-0 p-0 h-auto w-full" 
                    />
                  </div>
                ) : (
                  /* THE LOCKED UPSELL UI */
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
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] border-indigo-200 text-indigo-700 bg-indigo-50 mt-1 cursor-not-allowed">
                      Upgrade to Unlock
                    </Button>
                  </div>
                )}
                {/* ============================================================================ */}

                <SubmitButton 
                  title="Record Expense" 
                  loadingTitle="Recording..." 
                  className="w-full bg-neutral-900 text-white hover:bg-neutral-800" 
                />
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: FILTER & TABLE */}
        <div className="lg:col-span-2 space-y-4">
          
          <Card className="shadow-sm border-neutral-200 bg-white">
            <CardContent className="p-4">
              <form method="GET" className="flex flex-col xl:flex-row gap-3 xl:items-end">
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

          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-x-auto">
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
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                      No expense records found for this period.
                    </td>
                  </tr>
                ) : (
                  (expenseRecords as any[]).map((exp) => (
                    <tr key={exp.id} className="hover:bg-neutral-50 group transition-colors">
                      <td className="px-4 py-4 text-neutral-500">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-neutral-900">{exp.vendors?.name || 'Unknown Vendor'}</p>
                        <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-[150px] lg:max-w-[200px]">{exp.description}</p>
                        
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
                        <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/expenses/${exp.id}/edit`}>
                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50">Edit</Button>
                          </Link>
                          {isOwner && (
                            <form action={async (formData) => {
                              "use server";
                              await deleteExpense(formData);
                            }}>
                              <input type="hidden" name="id" value={exp.id} />
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

        </div>
      </div>
    </div>
  );
}