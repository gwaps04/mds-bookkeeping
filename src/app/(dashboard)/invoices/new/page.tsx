// src/app/(dashboard)/invoices/new/page.tsx
import { createClient } from "@/lib/supabase/server";
import InvoiceForm from "./InvoiceForm";
import Link from "next/link";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get Business ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user?.id)
    .single();

  // Fetch past customers to auto-populate the client dropdown!
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("business_id", profile?.business_id)
    .order("name");

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors bg-white px-3 py-1.5 rounded-md border border-neutral-200">
          &larr; Cancel
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Create New Invoice</h2>
        </div>
      </div>

      {/* RENDER THE INTERACTIVE CLIENT COMPONENT */}
      <InvoiceForm customers={customers || []} />
    </div>
  );
}