// src/app/(dashboard)/invoices/[id]/print/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PrintActions from "./PrintActions";

// NOTE: No standard layout wrapper because we need a blank canvas for printing!

export default async function PrintInvoicePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const invoiceId = params.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id, businesses(business_name, address, currency)").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  const bizData = profile?.businesses as any;
  const businessName = Array.isArray(bizData) ? bizData[0]?.business_name : bizData?.business_name || "Company Name";
  const address = Array.isArray(bizData) ? bizData[0]?.address : bizData?.address || "";
  const currency = Array.isArray(bizData) ? bizData[0]?.currency : bizData?.currency || "PHP";

  // Fetch Invoice
  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).eq("business_id", businessId).single();
  if (!invoice) redirect("/invoices");

  // Fetch Line Items
  const { data: lineItems } = await supabase.from("invoice_items").select("id, description, quantity, unit_price, total_price").eq("invoice_id", invoiceId).order("created_at", { ascending: true });

  // Fetch Payments to calculate balance
  const { data: payments } = await supabase.from("income").select("amount").eq("invoice_id", invoiceId);
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const balanceDue = Number(invoice.total_amount) - totalPaid;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  const displayId = `INV-${invoice.id.split('-')[0].toUpperCase()}`;

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white font-sans text-neutral-900 relative">
      
      <PrintActions />

      <div className="mx-auto max-w-4xl pt-24 print:pt-0 pb-12 print:pb-0">
        
        {/* THE A4 INVOICE CANVAS */}
        <div className="bg-white p-10 md:p-16 print:p-0 print:shadow-none shadow-sm border border-neutral-200 print:border-none">
          
          {/* HEADER SECTION */}
          <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-8 mb-8">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-neutral-900">{businessName}</h1>
              {address && <p className="text-sm text-neutral-500 mt-2 whitespace-pre-wrap">{address}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black uppercase tracking-widest text-neutral-200">Invoice</h2>
              <p className="text-sm font-bold text-neutral-900 mt-2">{displayId}</p>
              <p className="text-xs text-neutral-500 mt-1">Date: {new Date(invoice.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* BILL TO & TERMS SECTION */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Billed To</p>
              <p className="text-lg font-bold text-neutral-900">{invoice.client_name}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Payment Due</p>
              <p className="text-lg font-bold text-rose-600">{new Date(invoice.due_date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* LINE ITEMS TABLE */}
          <table className="w-full text-left text-sm mb-8">
            <thead className="border-b-2 border-neutral-200 text-neutral-900">
              <tr>
                <th className="py-3 font-bold uppercase tracking-wider text-[11px]">Description</th>
                <th className="py-3 font-bold uppercase tracking-wider text-[11px] text-center w-24">Qty</th>
                <th className="py-3 font-bold uppercase tracking-wider text-[11px] text-right w-32">Unit Price</th>
                <th className="py-3 font-bold uppercase tracking-wider text-[11px] text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(lineItems || []).map((item) => (
                <tr key={item.id}>
                  <td className="py-4 font-medium text-neutral-800">{item.description}</td>
                  <td className="py-4 text-center text-neutral-600">{item.quantity}</td>
                  <td className="py-4 text-right text-neutral-600">{formatCurrency(Number(item.unit_price))}</td>
                  <td className="py-4 text-right font-bold text-neutral-900">{formatCurrency(Number(item.total_price))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS SECTION */}
          <div className="flex justify-end">
            <div className="w-full sm:w-1/2 space-y-3">
              <div className="flex justify-between text-sm pt-4 border-t border-neutral-200">
                <span className="text-neutral-500 font-bold uppercase tracking-wider text-[11px]">Subtotal</span>
                <span className="font-bold text-neutral-900">{formatCurrency(Number(invoice.total_amount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 font-bold uppercase tracking-wider text-[11px]">Amount Paid</span>
                <span className="font-bold text-emerald-600">-{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 mt-4 border-t-2 border-neutral-900">
                <span className="text-neutral-900 font-black uppercase tracking-wider text-sm">Balance Due</span>
                <span className="font-black text-2xl text-rose-600">{formatCurrency(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-24 pt-8 border-t border-neutral-200 text-center">
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Thank you for your business</p>
          </div>

        </div>
      </div>
    </div>
  );
}