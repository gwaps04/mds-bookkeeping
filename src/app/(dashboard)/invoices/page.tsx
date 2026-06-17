// src/app/(dashboard)/invoices/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createInvoice } from "@/features/invoices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get Business Currency
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(currency)")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // 2. Fetch Invoices with their main Line Item Description
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      *,
      invoice_items (description)
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">B2B Invoicing</h2>
        <p className="text-neutral-500 mt-1">Generate bills for clients and track delayed payments.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* CREATE INVOICE FORM */}
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg">Draft New Invoice</CardTitle>
              <CardDescription>Bill a client for products or services.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                "use server";
                await createInvoice(formData);
              }} className="space-y-4">
                
                <div className="space-y-2">
                  <Label htmlFor="client_name">B2B Client / Company</Label>
                  <Input id="client_name" name="client_name" placeholder="e.g. ACME Corp" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Payment Due Date</Label>
                  <Input id="due_date" name="due_date" type="date" required />
                </div>

                <div className="pt-4 border-t border-neutral-100">
                  <p className="text-sm font-semibold mb-3">Line Item Details</p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Service / Product Description</Label>
                      <Input id="description" name="description" placeholder="e.g. June Retainer Fee" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Qty / Hours</Label>
                        <Input id="quantity" name="quantity" type="number" min="1" step="1" defaultValue="1" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit_price">Unit Price</Label>
                        <Input id="unit_price" name="unit_price" type="number" step="0.01" min="0" placeholder="0.00" required />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4">Send Invoice</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* INVOICES DATA TABLE */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 font-medium text-neutral-900">Client</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Item</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Due Date</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Status</th>
                  <th className="px-6 py-4 font-medium text-neutral-900 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {(!invoices || invoices.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      No invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  (invoices as any[]).map((inv) => {
                    const firstItemDesc = inv.invoice_items && inv.invoice_items.length > 0 ? inv.invoice_items[0].description : "Services Rendered";
                    
                    return (
                      <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-neutral-900">
                          {inv.client_name}
                        </td>
                        <td className="px-6 py-4 text-neutral-500">
                          {firstItemDesc}
                        </td>
                        <td className="px-6 py-4 text-neutral-500">
                          {new Date(inv.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            inv.status === 'paid' ? 'bg-green-50 text-green-700' :
                            inv.status === 'draft' ? 'bg-neutral-100 text-neutral-700' :
                            'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {inv.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-neutral-900">
                          {formatCurrency(Number(inv.total_amount))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}