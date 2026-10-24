// FILE: src/app/(dashboard)/invoices/new/page.tsx
import { createClient } from "@/lib/supabase/server";
import InvoiceForm from "./InvoiceForm";
import Link from "next/link";
import { getTenantAccessLevel } from "@/lib/subscription";
import { redirect } from "next/navigation";

export default async function NewInvoicePage(props: {
  // WOZ FIX: Next.js 15+ requires searchParams to be awaited as a Promise
  searchParams: Promise<{ clientName?: string; amount?: string; desc?: string }>;
}) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user?.id)
    .single();

  const { data: business } = await supabase
    .from("businesses")
    .select("subscription_status, subscription_tier, trial_ends_at")
    .eq("id", profile?.business_id)
    .single();

  const accessState = getTenantAccessLevel(business);
  if (accessState.isLocked) {
    redirect("/invoices"); 
  }

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("business_id", profile?.business_id)
    .order("name");

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
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 truncate">Create New Invoice</h2>
        </div>
      </div>

      {/* WOZ UPGRADE: Passing the URL Parameters down as initial state props */}
      <InvoiceForm 
        customers={customers || []} 
        inventoryItems={inventoryItems || []} 
        initialClientName={searchParams?.clientName}
        initialAmount={searchParams?.amount}
        initialDesc={searchParams?.desc}
      />
    </div>
  );
}