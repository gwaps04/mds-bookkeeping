// src/app/(dashboard)/clients/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function CRMPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get Business ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;

  // 2. Fetch Customers & Vendors Alphabetically
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Client & Vendor Directory</h2>
        <p className="text-neutral-500 mt-1">Manage your business relationships and contact information.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* CLIENTS & CUSTOMERS DIRECTORY */}
        <Card className="shadow-sm border-neutral-200">
          <CardHeader>
            <CardTitle className="text-xl text-blue-700">B2B Clients & Customers</CardTitle>
            <CardDescription>People and businesses paying you.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 font-medium text-neutral-900">Name</th>
                    <th className="px-6 py-3 font-medium text-neutral-900">Contact Details</th>
                    <th className="px-6 py-3 font-medium text-neutral-900">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {(!customers || customers.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                        No clients found. Log an income to auto-generate a client.
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-neutral-900">
                          {customer.name}
                        </td>
                        <td className="px-6 py-4 text-neutral-600">
                          <div className="flex flex-col">
                            <span>{customer.email || <span className="text-neutral-400 italic">No email</span>}</span>
                            <span className="text-xs text-neutral-500">{customer.phone || <span className="text-neutral-400 italic">No phone</span>}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-500 text-xs">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* VENDORS & MERCHANTS DIRECTORY */}
        <Card className="shadow-sm border-neutral-200">
          <CardHeader>
            <CardTitle className="text-xl text-red-700">Vendors & Merchants</CardTitle>
            <CardDescription>People and businesses you are paying.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 font-medium text-neutral-900">Name</th>
                    <th className="px-6 py-3 font-medium text-neutral-900">Contact Details</th>
                    <th className="px-6 py-3 font-medium text-neutral-900">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {(!vendors || vendors.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                        No vendors found. Log an expense to auto-generate a vendor.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-neutral-900">
                          {vendor.name}
                        </td>
                        <td className="px-6 py-4 text-neutral-600">
                          <div className="flex flex-col">
                            <span>{vendor.email || <span className="text-neutral-400 italic">No email</span>}</span>
                            <span className="text-xs text-neutral-500">{vendor.phone || <span className="text-neutral-400 italic">No phone</span>}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-500 text-xs">
                          {new Date(vendor.created_at).toLocaleDateString()}
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
    </div>
  );
}