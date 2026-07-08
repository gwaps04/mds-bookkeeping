// src/app/(dashboard)/invoices/[id]/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Printer, CheckCircle2, Clock, Ban, Receipt, Landmark } from "lucide-react";

export default async function InvoiceDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const invoiceId = params.id;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id, businesses(currency)").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  const bizData = profile?.businesses as any;
  const currency = Array.isArray(bizData) ? bizData[0]?.currency : bizData?.currency || "PHP";

  // 1. Fetch the Invoice
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("business_id", businessId)
    .single();

  if (!invoice) redirect("/invoices");

  // 2. Fetch the Line Items
  const { data: lineItems } = await supabase
    .from("invoice_items")
    .select("id, description, quantity, unit_price, total_price, items(name)")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  // 3. Fetch any Payments already made against this invoice
  const { data: payments } = await supabase
    .from("income")
    .select("id, amount, date, accounts(name)")
    .eq("invoice_id", invoiceId);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  
  const displayId = `INV-${invoice.id.split('-')[0].toUpperCase()}`;
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const balanceDue = Number(invoice.total_amount) - totalPaid;

  const isPaid = invoice.status === 'paid';
  const isVoid = invoice.status === 'void';

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-xl mx-auto pb-12">
      
      {/* HEADER & NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="outline" size="icon" className="bg-white rounded-full"><ArrowLeft size={16} /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">{displayId}</h2>
              
              {/* STATUS BADGES */}
              {isPaid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={14} /> Paid in Full</span>
              ) : isVoid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200"><Ban size={14} /> Voided</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200"><Clock size={14} /> Awaiting Payment</span>
              )}
            </div>
            <p className="text-sm text-neutral-500 mt-1">Billed to <strong className="text-neutral-900">{invoice.client_name}</strong></p>
          </div>
        </div>

        {/* TOP ACTIONS */}
        <div className="flex items-center gap-2">
          {/* We will build this PDF Print route next! */}
          <Link href={`/invoices/${invoice.id}/print`} target="_blank">
            <Button variant="outline" className="bg-white hover:bg-neutral-50 shadow-sm transition-colors border-neutral-200">
              <Printer size={16} className="mr-2 text-neutral-600" /> Print / PDF
            </Button>
          </Link>
          
          {/* Placeholder for the Receive Payment button (Phase 4) */}
          {!isPaid && !isVoid && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors">
              <Landmark size={16} className="mr-2" /> Receive Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: INVOICE DETAILS & LINE ITEMS */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-neutral-200 overflow-hidden">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Receipt size={18} className="text-neutral-500" /> Itemized Charges</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[500px]">
                <thead className="bg-white border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-neutral-600">Description</th>
                    <th className="px-6 py-4 font-semibold text-neutral-600 text-center">Qty</th>
                    <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Unit Price</th>
                    <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {(lineItems || []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-neutral-900">{item.description}</p>
                        {item.items && <p className="text-[10px] text-neutral-500 mt-0.5">Catalog: {item.items.name}</p>}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-neutral-700">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-neutral-600">{formatCurrency(Number(item.unit_price))}</td>
                      <td className="px-6 py-4 text-right font-bold text-neutral-900">{formatCurrency(Number(item.total_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-neutral-50/50 p-6 border-t border-neutral-100 flex justify-end">
              <div className="w-full sm:w-1/2 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 font-medium">Subtotal</span>
                  <span className="font-bold text-neutral-900">{formatCurrency(Number(invoice.total_amount))}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span className="font-medium">Total Paid</span>
                  <span className="font-bold">-{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-lg pt-3 border-t border-neutral-200">
                  <span className="font-bold text-neutral-900">Balance Due</span>
                  <span className="font-black text-rose-600">{formatCurrency(balanceDue)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: SUMMARY & PAYMENT HISTORY */}
        <div className="space-y-6">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4">
              <CardTitle className="text-base font-bold text-neutral-900">Billing Information</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Creation Date</p>
                <p className="text-sm font-medium text-neutral-900 mt-1">{new Date(invoice.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="pt-4 border-t border-neutral-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Payment Due By</p>
                <p className="text-sm font-medium text-rose-700 mt-1">{new Date(invoice.due_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </CardContent>
          </Card>

          {payments && payments.length > 0 && (
            <Card className="shadow-sm border-neutral-200">
              <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 py-4">
                <CardTitle className="text-base font-bold text-emerald-900">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-neutral-100">
                  {payments.map((payment: any) => (
                    <div key={payment.id} className="p-4 flex justify-between items-center bg-white hover:bg-neutral-50 transition-colors">
                      <div>
                        <p className="font-bold text-neutral-900 text-sm">{formatCurrency(Number(payment.amount))}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{new Date(payment.date).toLocaleDateString()} • {payment.accounts?.name}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        Received
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}