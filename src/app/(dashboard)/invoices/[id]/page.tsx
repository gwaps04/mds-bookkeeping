// src/app/(dashboard)/invoices/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/PrintButton";
import { redirect } from "next/navigation";

export default async function InvoicePrintPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch the exact invoice, its items, and the business details
  const { data: invoice } = await supabase
    .from("invoices")
    .select(`
      *,
      invoice_items(*),
      businesses(business_name, tax_id, address)
    `)
    .eq("id", params.id)
    .single();

  if (!invoice) redirect("/invoices");

  const business = Array.isArray(invoice.businesses) ? invoice.businesses[0] : invoice.businesses;
  const items = invoice.invoice_items || [];

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      
      {/* ACTION BAR (Hidden on Print) */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <a href="/invoices" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
          &larr; Back to Invoices
        </a>
        <PrintButton />
      </div>

      {/* THE ACTUAL INVOICE DOCUMENT */}
      <div className="bg-white p-10 md:p-16 border border-neutral-200 shadow-sm print:border-none print:shadow-none print:p-0 rounded-xl">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-neutral-200 pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-black text-neutral-900 uppercase tracking-tighter">INVOICE</h1>
            <p className="text-neutral-500 mt-2">Invoice #: <span className="font-mono text-neutral-900">{invoice.id.split('-')[0].toUpperCase()}</span></p>
            <p className="text-neutral-500">Date: <span className="text-neutral-900">{new Date(invoice.created_at).toLocaleDateString()}</span></p>
            <p className="text-neutral-500">Due Date: <span className="text-neutral-900 font-medium">{new Date(invoice.due_date).toLocaleDateString()}</span></p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-neutral-900">{business?.business_name || 'My Business'}</h2>
            {business?.address && <p className="text-neutral-500 text-sm mt-1 max-w-[200px]">{business.address}</p>}
            {business?.tax_id && <p className="text-neutral-500 text-sm mt-1">TIN: {business.tax_id}</p>}
          </div>
        </div>

        {/* BILLING INFO */}
        <div className="mb-12">
          <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-2">Bill To</p>
          <h3 className="text-lg font-bold text-neutral-900">{invoice.client_name}</h3>
        </div>

        {/* LINE ITEMS TABLE */}
        <table className="w-full text-left mb-8">
          <thead className="border-b border-neutral-200 text-sm">
            <tr>
              <th className="py-3 font-bold text-neutral-900">Description</th>
              <th className="py-3 font-bold text-neutral-900 text-center">Qty</th>
              <th className="py-3 font-bold text-neutral-900 text-right">Unit Price</th>
              <th className="py-3 font-bold text-neutral-900 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {items.map((item: any) => (
              <tr key={item.id}>
                <td className="py-4 text-neutral-800">{item.description}</td>
                <td className="py-4 text-center text-neutral-600">{item.quantity}</td>
                <td className="py-4 text-right text-neutral-600">₱{Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td className="py-4 text-right font-medium text-neutral-900">₱{Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div className="flex justify-end border-t border-neutral-200 pt-6">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span>₱{Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-neutral-900 border-t border-neutral-200 pt-3">
              <span>Total Due</span>
              <span>₱{Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-24 pt-8 border-t border-neutral-100 text-center text-sm text-neutral-400">
          <p>Thank you for your business. Please remit payment by the due date.</p>
        </div>

      </div>
    </div>
  );
}