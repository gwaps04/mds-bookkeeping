// src/app/(dashboard)/clients/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { approveBusiness } from "@/features/businesses/actions";
import { Button } from "@/components/ui/button";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redundant security check at the page level
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
  if (profile?.role !== "super_admin") redirect("/dashboard");

  // Fetch all business owners and their associated businesses
  const { data: clients } = await supabase
    .from("profiles")
    .select(`
      full_name,
      email,
      businesses (
        id,
        business_name,
        status,
        currency
      )
    `)
    .eq("role", "business_owner")
    .not("business_id", "is", null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Client Management</h2>
        <p className="text-neutral-500 mt-1">Review and approve business tenants across the platform.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 font-medium text-neutral-900">Client Name</th>
              <th className="px-6 py-4 font-medium text-neutral-900">Business Name</th>
              <th className="px-6 py-4 font-medium text-neutral-900">Currency</th>
              <th className="px-6 py-4 font-medium text-neutral-900">Status</th>
              <th className="px-6 py-4 font-medium text-neutral-900 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {clients?.map((client: any, i) => {
              const business = client.businesses;
              // Handle Supabase array/object return variability
              const bizData = Array.isArray(business) ? business[0] : business;
              
              if (!bizData) return null;

              return (
                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-neutral-900">{client.full_name}</div>
                    <div className="text-neutral-500">{client.email}</div>
                  </td>
                  <td className="px-6 py-4 text-neutral-600">{bizData.business_name}</td>
                  <td className="px-6 py-4 text-neutral-600 uppercase">{bizData.currency}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      bizData.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {bizData.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {bizData.status === 'pending' && (
                      <form action={async () => {
                        "use server";
                        await approveBusiness(bizData.id);
                      }}>
                        <Button type="submit" size="sm" variant="default">
                          Approve Tenant
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {(!clients || clients.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                  No business clients found in the registry.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}