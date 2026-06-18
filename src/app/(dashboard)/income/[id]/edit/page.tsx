// src/app/(dashboard)/income/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { updateIncome } from "@/features/income/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EditIncomePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user?.id)
    .single();
  const businessId = profile?.business_id;

  // 1. Fetch the exact record to edit AND join the customer name!
  const { data: record } = await supabase
    .from("income")
    .select(`
      *,
      customers (name)
    `)
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  // If the record doesn't exist, kick them back to the list
  if (!record) redirect("/income");

  // 2. Fetch Accounts for the Dropdowns
  const { data: assetAccounts } = await supabase.from("accounts").select("*").eq("business_id", businessId).eq("type", "asset");
  const { data: revenueAccounts } = await supabase.from("accounts").select("*").eq("business_id", businessId).eq("type", "revenue");

  // Safely extract the customer name
  const customerName = Array.isArray(record.customers) ? record.customers[0]?.name : record.customers?.name;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center gap-4 mb-8">
        <Link href="/income" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors bg-white px-3 py-1.5 rounded-md border border-neutral-200 shadow-sm">
          &larr; Cancel
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Edit Income Record</h2>
        </div>
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">Update Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={async (formData) => {
            "use server";
            await updateIncome(formData);
          }} className="space-y-6">
            
            {/* Hidden ID field so the server knows which row to update! */}
            <input type="hidden" name="id" value={record.id} />

            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer / Client</Label>
              <Input id="customer_name" name="customer_name" defaultValue={customerName || ''} required />
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
              <Label htmlFor="category_id">Revenue Category</Label>
              <Select name="category_id" defaultValue={record.category_id} required>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  {revenueAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_id">Deposit To (Bank / Cash)</Label>
              <Select name="account_id" defaultValue={record.account_id} required>
                <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {assetAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number (Optional)</Label>
              <Input id="reference_number" name="reference_number" defaultValue={record.reference_number || ''} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Notes (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={record.description || ''} 
                className="resize-none h-20"
              />
            </div>

            <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}