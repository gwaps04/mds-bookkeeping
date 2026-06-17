// src/app/(dashboard)/invoices/page.tsx
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user?.id).single();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .eq("business_id", profile?.business_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Invoices</h2>
          <p className="text-neutral-500 mt-1">Manage and generate professional billing documents.</p>
        </div>
        
        {/* THE REAL CREATE BUTTON */}
        <Link href="/invoices/new">
          <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-sm font-medium">
            + Create Invoice
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">Billing Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                <tr>
                  <th className="px-6 py-3 font-medium text-neutral-900">Invoice ID</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Client</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Amount</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Status</th>
                  <th className="px-6 py-3 font-medium text-neutral-900 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {(!invoices || invoices.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      <p className="text-base font-medium text-neutral-900 mb-1">No invoices created yet.</p>
                      <p>Click "Create Invoice" above to generate your first bill.</p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-neutral-500">
                        {inv.id.split('-')[0].toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-900">
                        {inv.client_name}
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-900">
                        ₱{Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="outline" size="sm" className="hover:bg-neutral-100">View / Print</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}