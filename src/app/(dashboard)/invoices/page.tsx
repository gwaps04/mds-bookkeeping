// src/app/(dashboard)/invoices/page.tsx
import { createClient } from "@/lib/supabase/server";
import { createInvoice } from "@/features/invoices/actions";
import { DownloadPDFButton } from "@/features/invoices/components/DownloadPDFButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(business_name, currency)")
    .eq("id", user?.id)
    .single();

  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // NEW: We are using a Left Join to grab the Parent (invoices) AND the Children (invoice_items)
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      *,
      invoice_items (*)
    `)
    .eq("business_id", profile?.business_id)
    .order("created_at", { ascending: false });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Invoicing</h2>
        <p className="text-neutral-500 mt-1">Draft, send, and track payments from your clients.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* FORM COLUMN */}
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg">Draft Invoice</CardTitle>
              <CardDescription>Create a new client bill.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                "use server";
                await createInvoice(formData);
              }} className="space-y-4">
                
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name</Label>
                  <Input id="client_name" name="client_name" placeholder="e.g. Acme Corp" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input id="due_date" name="due_date" type="date" required />
                </div>

                <div className="pt-4 border-t border-neutral-200 space-y-4">
                  <Label className="text-neutral-500 uppercase tracking-wider text-xs font-semibold">Primary Line Item</Label>
                  <div className="space-y-2">
                    <Label htmlFor="description">Service / Product</Label>
                    <Input id="description" name="description" placeholder="e.g. Web Development" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input id="quantity" name="quantity" type="number" min="1" defaultValue="1" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit_price">Unit Price</Label>
                      <Input id="unit_price" name="unit_price" type="number" step="0.01" min="0" placeholder="0.00" required />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full">Generate Draft</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* DATA TABLE COLUMN */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 font-medium text-neutral-900">Client</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Status</th>
                  <th className="px-6 py-4 font-medium text-neutral-900 text-right">Total</th>
                  <th className="px-6 py-4 font-medium text-neutral-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {invoices?.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {inv.client_name}
                      <div className="text-neutral-500 font-normal text-xs">Due: {inv.due_date}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider
                        ${inv.status === 'draft' ? 'bg-neutral-100 text-neutral-600' : 
                          inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-neutral-900">
                      {formatCurrency(Number(inv.total_amount))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* NEW: THE PDF BUTTON */}
                      <DownloadPDFButton 
                        invoice={inv} 
                        items={inv.invoice_items} 
                        business={bizData} 
                        currency={currency} 
                      />
                    </td>
                  </tr>
                ))}
                
                {(!invoices || invoices.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                      No invoices found. Generate a draft to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}