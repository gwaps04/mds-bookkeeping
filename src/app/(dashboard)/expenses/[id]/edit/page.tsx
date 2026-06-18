// src/app/(dashboard)/expenses/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { updateExpense } from "@/features/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EditExpensePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();
  const businessId = profile?.business_id;

  // 1. Fetch record & Vendor Name
  const { data: record } = await supabase
    .from("expenses")
    .select("*, vendors (name)")
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!record) redirect("/expenses");

  // 2. Fetch Accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*").eq("business_id", businessId).in("type", ["asset", "expense"]);

  const bankAccounts = accounts?.filter(a => a.type === "asset") || [];
  const expenseCategories = accounts?.filter(a => a.type === "expense") || [];

  const vendorName = Array.isArray(record.vendors) ? record.vendors[0]?.name : record.vendors?.name;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center gap-4 mb-8">
        <Link href="/expenses" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 bg-white px-3 py-1.5 rounded-md border shadow-sm">
          &larr; Cancel
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Edit Expense Record</h2>
        </div>
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader><CardTitle className="text-lg">Update Details</CardTitle></CardHeader>
        <CardContent>
          <form action={async (formData) => {
            "use server";
            await updateExpense(formData);
          }} className="space-y-6">
            
            <input type="hidden" name="id" value={record.id} />

            <div className="space-y-2">
              <Label htmlFor="vendor_name">Vendor / Payee</Label>
              <Input id="vendor_name" name="vendor_name" defaultValue={vendorName || ''} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={record.amount} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={record.date} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Expense Category</Label>
              <Select name="category_id" defaultValue={record.category_id} required>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_id">Paid From (Bank / Cash)</Label>
              <Select name="account_id" defaultValue={record.account_id} required>
                <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference No. (Optional)</Label>
              <Input id="reference_number" name="reference_number" defaultValue={record.reference_number || ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Notes / Details</Label>
              <Textarea id="description" name="description" defaultValue={record.description || ''} className="resize-none h-20" required />
            </div>

            <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white">Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}