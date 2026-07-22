// src/app/(dashboard)/expenses/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { updateExpense } from "@/features/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { ArrowLeft, Paperclip } from "lucide-react"; 
import { redirect } from "next/navigation";

// THE FIX: Import the new Client Component
import ReceiptInput from "./ReceiptInput";

export default async function EditExpensePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ============================================================================
  // 1. THE GATEKEEPER: Get Profile, RBAC Flags & Business Features
  // ============================================================================
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      business_id, 
      role, 
      can_access_expenses,
      businesses(allow_receipt_uploads)
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

  if (!isOwner && profile?.can_access_expenses !== true) {
    redirect("/dashboard");
  }
  // ============================================================================

  const canUploadReceipts = bizData?.allow_receipt_uploads !== false; 

  // 2. Fetch the specific Expense Record
  const { data: expense } = await supabase
    .from("expenses")
    .select(`*, vendors (name)`)
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (!expense) redirect("/expenses"); 

  // 3. Fetch Accounts for dropdowns
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name, type")
    .eq("business_id", businessId)
    .in("type", ["asset", "expense"]) 
    .order("name");

  const bankAccounts = accounts?.filter(a => a.type === "asset") || [];
  const expenseCategories = accounts?.filter(a => a.type === "expense") || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto pb-12">
      
      {/* HEADER & BACK NAVIGATION */}
      <div className="flex items-center gap-4">
        <Link href="/expenses">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-white shadow-sm border-neutral-200 hover:bg-neutral-50">
            <ArrowLeft size={16} className="text-neutral-600" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Edit Expense</h2>
          <p className="text-sm text-neutral-500 mt-0.5 font-medium">Update transaction details or attach a new receipt.</p>
        </div>
      </div>

      <Card className="shadow-sm border-neutral-200 bg-white">
        <CardContent className="p-6">
          <form action={async (formData) => {
            "use server";
            await updateExpense(formData);
          }} className="space-y-5">
            
            <input type="hidden" name="id" value={expense.id} />

            <div className="space-y-1.5">
              <Label htmlFor="vendor_name" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Vendor / Payee</Label>
              <Input 
                id="vendor_name" 
                name="vendor_name" 
                defaultValue={expense.vendors?.name || ""} 
                placeholder="e.g. Meralco, Office Warehouse" 
                required 
                className="focus-visible:ring-neutral-900 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Amount</Label>
                <Input 
                  id="amount" 
                  name="amount" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  defaultValue={expense.amount} 
                  required 
                  className="focus-visible:ring-neutral-900 font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Date</Label>
                <Input 
                  id="date" 
                  name="date" 
                  type="date" 
                  defaultValue={expense.date} 
                  required 
                  className="focus-visible:ring-neutral-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Expense Category</Label>
                <Select name="category_id" defaultValue={expense.category_id} required>
                  <SelectTrigger className="focus:ring-neutral-900"><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {expenseCategories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="account_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Paid From (Bank / Cash)</Label>
                <Select name="account_id" defaultValue={expense.account_id} required>
                  <SelectTrigger className="focus:ring-neutral-900"><SelectValue placeholder="Select account..." /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {bankAccounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reference_number" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Reference No. (Optional)</Label>
              <Input 
                id="reference_number" 
                name="reference_number" 
                defaultValue={expense.reference_number || ""} 
                placeholder="e.g. Receipt No." 
                className="focus-visible:ring-neutral-900 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Notes / Details</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={expense.description || ""} 
                placeholder="What was this for?" 
                className="resize-none h-20 focus-visible:ring-neutral-900" 
                required 
              />
            </div>

            {/* ============================================================================ */}
            {/* THE RECEIPT MANAGEMENT ZONE */}
            {/* ============================================================================ */}
            <div className="pt-2 border-t border-neutral-100">
              
              {expense.receipt_url && (
                <div className="mb-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">Current Attachment</p>
                    <p className="text-[10px] text-neutral-500">A receipt is already linked to this expense.</p>
                  </div>
                  <a 
                    href={expense.receipt_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md text-xs font-bold transition-colors shadow-sm"
                  >
                    <Paperclip size={12} /> View File
                  </a>
                </div>
              )}

              {/* THE FIX: Replaced the static HTML with our intelligent Client Component */}
              <ReceiptInput 
                isLocked={!canUploadReceipts} 
                hasExistingReceipt={!!expense.receipt_url} 
              />
              
            </div>
            {/* ============================================================================ */}

            <div className="pt-4 flex gap-3">
              <Link href="/expenses" className="flex-1">
                <Button type="button" variant="outline" className="w-full text-neutral-600 font-bold border-neutral-200 shadow-sm transition-colors hover:bg-neutral-50">Cancel</Button>
              </Link>
              <SubmitButton 
                title="Save Changes" 
                loadingTitle="Saving..." 
                className="flex-[2] bg-neutral-900 text-white hover:bg-neutral-800 font-bold shadow-sm transition-all" 
              />
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}