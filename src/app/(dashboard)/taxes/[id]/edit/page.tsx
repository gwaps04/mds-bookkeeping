// src/app/(dashboard)/taxes/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { updateTaxPayment } from "@/features/taxes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EditTaxPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();
  const businessId = profile?.business_id;

  // 1. Fetch exact tax record
  const { data: record } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!record) redirect("/taxes");

  // 2. Fetch Asset Accounts
  const { data: bankAccounts } = await supabase.from("accounts").select("*").eq("business_id", businessId).eq("type", "asset");

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center gap-4 mb-8">
        <Link href="/taxes" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 bg-white px-3 py-1.5 rounded-md border shadow-sm">
          &larr; Cancel
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Edit Tax Record</h2>
        </div>
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader><CardTitle className="text-lg">Update Remittance</CardTitle></CardHeader>
        <CardContent>
          <form action={async (formData) => {
            "use server";
            await updateTaxPayment(formData);
          }} className="space-y-6">
            
            <input type="hidden" name="id" value={record.id} />

            <div className="space-y-2">
              <Label htmlFor="description">BIR Form Details</Label>
              <Input id="description" name="description" defaultValue={record.description || ''} required />
              <p className="text-xs text-neutral-500">Edit the description if you accidentally selected the wrong form.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₱)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={record.amount} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date Paid</Label>
                <Input id="date" name="date" type="date" defaultValue={record.date} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_id">Paid From (Bank / Cash)</Label>
              <Select name="account_id" defaultValue={record.account_id} required>
                <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference No. (Optional)</Label>
              <Input id="reference" name="reference" defaultValue={record.reference_number || ''} />
            </div>

            <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white">Save Tax Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}