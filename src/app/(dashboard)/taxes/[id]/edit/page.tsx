// src/app/(dashboard)/taxes/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { updateTaxPayment } from "@/features/taxes/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";

export default async function EditTaxPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ============================================================================
  // 1. THE GATEKEEPER: Fetching the NEW Tax RBAC Flag
  // ============================================================================
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      business_id, 
      role, 
      can_access_taxes,
      businesses(is_tax_registered)
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

  // Key 1 (Business Scope)
  if (!bizData?.is_tax_registered && !isSuperAdmin) {
    redirect("/settings");
  }

  // Key 2 (User Scope): THE FIX - Now explicitly enforcing `can_access_taxes`
  if (!isOwner && profile?.can_access_taxes !== true) {
    redirect("/dashboard");
  }
  // ============================================================================

  // 2. Fetch exact tax record
  const { data: record } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", businessId)
    .single();

  if (!record) redirect("/taxes");

  // 3. Fetch Asset Accounts
  const { data: bankAccounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("business_id", businessId)
    .eq("type", "asset")
    .order("name");

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto pb-12 w-full min-w-0 px-4 sm:px-0">
      
      {/* HEADER & BACK NAVIGATION */}
      <div className="flex items-center gap-4">
        <Link href="/taxes">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full bg-white shadow-sm border-neutral-200 hover:bg-neutral-50">
            <ArrowLeft size={16} className="text-neutral-600" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 truncate">Edit Tax Record</h2>
          <p className="text-sm text-neutral-500 mt-0.5 font-medium">Update statutory remittance details.</p>
        </div>
      </div>

      <Card className="shadow-sm border-neutral-200 bg-white w-full min-w-0">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-5">
          <CardTitle className="text-lg">Update Remittance</CardTitle>
          <CardDescription>Make corrections to a previously logged tax payment.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={async (formData) => {
            "use server";
            await updateTaxPayment(formData);
          }} className="space-y-6 w-full">
            
            <input type="hidden" name="id" value={record.id} />

            <div className="space-y-1.5 w-full">
              <Label htmlFor="description" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">BIR Form Details</Label>
              <Input 
                id="description" 
                name="description" 
                defaultValue={record.description || ''} 
                required 
                className="w-full focus-visible:ring-blue-600 font-medium"
              />
              <p className="text-[11px] text-neutral-400 font-medium pt-1">Edit the description if you accidentally selected the wrong form.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="space-y-1.5 w-full">
                <Label htmlFor="amount" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Amount (₱)</Label>
                <Input 
                  id="amount" 
                  name="amount" 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  defaultValue={record.amount} 
                  required 
                  className="w-full focus-visible:ring-blue-600 font-bold text-rose-600"
                />
              </div>
              <div className="space-y-1.5 w-full">
                <Label htmlFor="date" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Date Paid</Label>
                <Input 
                  id="date" 
                  name="date" 
                  type="date" 
                  defaultValue={record.date} 
                  required 
                  className="w-full focus-visible:ring-blue-600"
                />
              </div>
            </div>

            <div className="space-y-1.5 w-full">
              <Label htmlFor="account_id" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Paid From (Bank / Cash)</Label>
              <Select name="account_id" defaultValue={record.account_id} required>
                <SelectTrigger className="w-full focus:ring-blue-600"><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full pb-2">
              <Label htmlFor="reference" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Reference No. (Optional)</Label>
              <Input 
                id="reference" 
                name="reference" 
                defaultValue={record.reference_number || ''} 
                className="w-full focus-visible:ring-blue-600 font-mono"
              />
            </div>

            <div className="pt-4 border-t border-neutral-100 flex gap-3">
              <Link href="/taxes" className="flex-1">
                <Button type="button" variant="outline" className="w-full text-neutral-600 font-bold border-neutral-200 shadow-sm transition-colors hover:bg-neutral-50 h-11 sm:h-10">Cancel</Button>
              </Link>
              <SubmitButton 
                title="Save Tax Changes" 
                loadingTitle="Updating..." 
                className="flex-[2] bg-blue-700 hover:bg-blue-800 text-white font-bold h-11 sm:h-10 shadow-sm transition-all" 
              />
            </div>
            
          </form>
        </CardContent>
      </Card>
    </div>
  );
}