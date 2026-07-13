// src/app/(dashboard)/income/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { updateIncome } from "@/features/income/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { redirect } from "next/navigation";

// THE FIX 1: Import the native SubmitButton for the loading state
import SubmitButton from "@/components/SubmitButton";

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

  const { data: record } = await supabase
    .from("income")
    .select(`
      *,
      customers (name)
    `)
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!record) redirect("/income");

  // THE FIX 2: Modified the query to include BOTH 'revenue' and 'equity' types
  const { data: assetAccounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("business_id", businessId)
    .eq("type", "asset")
    .order("name");
    
  const { data: revenueAccounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("business_id", businessId)
    .in("type", ["revenue", "equity"]) 
    .order("name");

  const customerName = Array.isArray(record.customers) ? record.customers[0]?.name : record.customers?.name;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 w-full min-w-0 px-4 sm:px-0">
      
      <div className="flex items-center gap-4 mb-8">
        <Link href="/income" className="text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors bg-white px-4 py-2 rounded-md border border-neutral-200 shadow-sm">
          &larr; Cancel
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 truncate">Edit Income Record</h2>
        </div>
      </div>

      <Card className="shadow-sm border-neutral-200 w-full min-w-0">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-5">
          <CardTitle className="text-lg">Update Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={async (formData) => {
            "use server";
            await updateIncome(formData);
          }} className="space-y-6 w-full">
            
            <input type="hidden" name="id" value={record.id} />

            <div className="space-y-1.5 w-full">
              <Label htmlFor="customer_name" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Customer / Client</Label>
              <Input id="customer_name" name="customer_name" defaultValue={customerName || ''} required className="w-full focus-visible:ring-green-600 font-medium" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="space-y-1.5 w-full">
                <Label htmlFor="amount" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Amount</Label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0" defaultValue={record.amount} required className="w-full focus-visible:ring-green-600 font-bold" />
              </div>
              <div className="space-y-1.5 w-full">
                <Label htmlFor="date" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={record.date} required className="w-full focus-visible:ring-green-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="space-y-1.5 w-full">
                {/* THE FIX 3: Updated label to explicitly mention Equity to reduce user confusion */}
                <Label htmlFor="category_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Revenue / Equity Category</Label>
                <Select name="category_id" defaultValue={record.category_id} required>
                  <SelectTrigger className="w-full focus:ring-green-600">
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] w-full">
                    {revenueAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 w-full">
                <Label htmlFor="account_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Deposit To (Bank / Cash)</Label>
                <Select name="account_id" defaultValue={record.account_id} required>
                  <SelectTrigger className="w-full focus:ring-green-600">
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px] w-full">
                    {assetAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 w-full">
              <Label htmlFor="reference_number" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Reference Number (Optional)</Label>
              <Input id="reference_number" name="reference_number" defaultValue={record.reference_number || ''} className="w-full focus-visible:ring-green-600 font-mono" />
            </div>

            <div className="space-y-1.5 w-full pb-2">
              <Label htmlFor="description" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Notes (Optional)</Label>
              <Textarea 
                id="description" 
                name="description" 
                defaultValue={record.description || ''} 
                className="w-full resize-none h-20 focus-visible:ring-green-600"
              />
            </div>

            <div className="pt-4 border-t border-neutral-100">
              <SubmitButton 
                title="Save Changes" 
                loadingTitle="Updating Record..." 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-11 sm:h-10 shadow-sm transition-all" 
              />
            </div>
            
          </form>
        </CardContent>
      </Card>
    </div>
  );
}