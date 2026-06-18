// src/app/(dashboard)/invoices/[id]/edit/page.tsx
import { createClient } from "@/lib/supabase/server";
import EditInvoiceForm from "./EditInvoiceForm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EditInvoiceServerPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();

  // 1. Fetch the master invoice AND its line items!
  const { data: invoice } = await supabase
    .from("invoices")
    .select(`*, invoice_items(*)`)
    .eq("id", params.id)
    .eq("business_id", profile?.business_id)
    .single();

  if (!invoice) redirect("/invoices");

  // 2. Fetch past customers for the autocomplete dropdown
  const { data: customers } = await supabase.from("customers").select("id, name").eq("business_id", profile?.business_id).order("name");

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors bg-white px-3 py-1.5 rounded-md border border-neutral-200">
          &larr; Cancel
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Edit Invoice</h2>
          <p className="text-neutral-500 text-sm">Invoice ID: {invoice.id.split('-')[0].toUpperCase()}</p>
        </div>
      </div>

      <EditInvoiceForm 
        invoice={invoice} 
        initialItems={invoice.invoice_items || []} 
        customers={customers || []} 
      />
    </div>
  );
}