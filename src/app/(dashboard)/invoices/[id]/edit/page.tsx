// src/app/(dashboard)/invoices/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import EditInvoiceForm from "./EditInvoiceForm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantAccessLevel } from "@/lib/subscription";

export default async function EditInvoiceServerPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();

  // 1. SUBSCRIPTION ROUTE GUARD
  const { data: business } = await supabase
    .from("businesses")
    .select("subscription_status, subscription_tier, trial_ends_at")
    .eq("id", profile?.business_id)
    .single();

  const accessState = getTenantAccessLevel(business);
  if (accessState.isLocked) redirect("/invoices");

  // 2. Fetch the master invoice AND its line items
  const { data: invoice } = await supabase
    .from("invoices")
    .select(`*, invoice_items(*)`)
    .eq("id", params.id)
    .eq("business_id", profile?.business_id)
    .single();

  if (!invoice) redirect("/invoices");

  // 3. Fetch past customers for the autocomplete dropdown
  const { data: customers } = await supabase.from("customers").select("id, name").eq("business_id", profile?.business_id).order("name");

  // 4. THE DATA HYDRATION PIPELINE: Fetch explicit inventory columns
  const { data: inventoryItems } = await supabase
    .from("items")
    .select("id, name, type, selling_price, quantity_on_hand, reorder_threshold") 
    .eq("business_id", profile?.business_id)
    .eq("is_archived", false) 
    .in("type", ["SELLABLE_SIMPLE", "SELLABLE_COMPOSITE"])
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0">
      <div className="flex items-center gap-4 w-full min-w-0">
        <Link href="/invoices" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors bg-white px-3 py-1.5 rounded-md border border-neutral-200 shadow-sm shrink-0">
          &larr; Cancel
        </Link>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 truncate">Edit Invoice</h2>
          <p className="text-neutral-500 text-sm">Invoice ID: {invoice.id.split('-')[0].toUpperCase()}</p>
        </div>
      </div>

      <EditInvoiceForm 
        invoice={invoice} 
        initialItems={invoice.invoice_items || []} 
        customers={customers || []} 
        inventoryItems={inventoryItems || []}
      />
    </div>
  );
}