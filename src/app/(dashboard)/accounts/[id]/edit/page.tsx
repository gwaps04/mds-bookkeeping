// src/app/(dashboard)/accounts/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { updateAccount } from "@/features/accounts/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

// THE FIX: Import the SubmitButton component
import SubmitButton from "@/components/SubmitButton"; 

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
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 w-full min-w-0 px-4 sm:px-0">
      
      <div className="flex items-center gap-4 mb-8">
        <Link href="/accounts" className="text-sm font-bold text-neutral-500 hover:text-neutral-900 bg-white px-4 py-2 rounded-md border border-neutral-200 shadow-sm transition-colors">
          &larr; Cancel
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 truncate">Edit Account Details</h2>
        </div>
      </div>

      <Card className="shadow-sm border-neutral-200 w-full min-w-0">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-5">
          <CardTitle className="text-lg">Account Configuration</CardTitle>
          <CardDescription>Update the name and classification of this ledger account.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={async (formData) => {
            "use server";
            await updateAccount(formData);
          }} className="space-y-6">
            
            <input type="hidden" name="id" value={account.id} />

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Account Name</Label>
              <Input id="name" name="name" defaultValue={account.name} required className="focus-visible:ring-blue-600 font-medium" />
              <p className="text-[11px] text-neutral-400 font-medium pt-1">Tip: If this account is no longer used, rename it to "(Archived) {account.name}".</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Financial Type</Label>
                <Select name="type" defaultValue={account.type} required>
                  <SelectTrigger className="focus:ring-blue-600"><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset (Banks/Cash)</SelectItem>
                    <SelectItem value="revenue">Revenue (Income)</SelectItem>
                    <SelectItem value="expense">Expense (Outflows)</SelectItem>
                    <SelectItem value="liability">Liability (Loans/Payables)</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Sub-Category</Label>
                <Input id="category" name="category" defaultValue={account.category || ''} placeholder="e.g. Current Asset, Utility" className="focus-visible:ring-blue-600" />
              </div>
            </div>

            <div className="space-y-1.5 pb-2">
              <Label htmlFor="account_number" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Bank / Account Number (Optional)</Label>
              <Input id="account_number" name="account_number" defaultValue={account.account_number || ''} placeholder="e.g. 1010, 0001-2345-67" className="focus-visible:ring-blue-600 font-mono" />
            </div>

            <div className="pt-4 border-t border-neutral-100">
              {/* THE FIX: Replaced standard Button with SubmitButton */}
              <SubmitButton 
                title="Save Account Configuration" 
                loadingTitle="Saving Updates..." 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 sm:h-10 shadow-sm transition-all" 
              />
            </div>
            
          </form>
        </CardContent>
      </Card>
    </div>
  );
}