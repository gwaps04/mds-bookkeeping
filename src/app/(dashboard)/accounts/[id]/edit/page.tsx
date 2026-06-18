// src/app/(dashboard)/accounts/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { updateAccount } from "@/features/accounts/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EditAccountPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();

  // Fetch the account
  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", profile?.business_id)
    .single();

  if (!account) redirect("/accounts");

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="flex items-center gap-4 mb-8">
        <Link href="/accounts" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 bg-white px-3 py-1.5 rounded-md border shadow-sm">
          &larr; Cancel
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Edit Account Details</h2>
        </div>
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">Account Configuration</CardTitle>
          <CardDescription>Update the name and classification of this ledger account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={async (formData) => {
            "use server";
            await updateAccount(formData);
          }} className="space-y-6">
            
            <input type="hidden" name="id" value={account.id} />

            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input id="name" name="name" defaultValue={account.name} required />
              <p className="text-xs text-neutral-500">Tip: If this account is no longer used, rename it to "(Archived) {account.name}".</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Financial Type</Label>
                <Select name="type" defaultValue={account.type} required>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset (Banks/Cash)</SelectItem>
                    <SelectItem value="revenue">Revenue (Income)</SelectItem>
                    <SelectItem value="expense">Expense (Outflows)</SelectItem>
                    <SelectItem value="liability">Liability (Loans/Payables)</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Sub-Category</Label>
                <Input id="category" name="category" defaultValue={account.category || ''} placeholder="e.g. Current Asset, Utility" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Bank / Account Number (Optional)</Label>
              <Input id="account_number" name="account_number" defaultValue={account.account_number || ''} placeholder="e.g. 1010, 0001-2345-67" />
            </div>

            <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white">Save Account Configuration</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}