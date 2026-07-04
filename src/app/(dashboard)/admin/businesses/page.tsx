// src/app/(dashboard)/admin/businesses/page.tsx
import { createClient } from "@/lib/supabase/server";
import { approveBusiness } from "@/features/businesses/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import ManageLimitButton from "./ManageLimitButton"; 
import ManageOrgLimitButton from "./ManageOrgLimitButton"; 
import ManageFeaturesButton from "./ManageFeaturesButton"; // <-- THE NEW IMPORT

export default async function SuperAdminBusinessesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== 'super_admin') {
    redirect("/dashboard");
  }

  // Fetch Businesses + Features
  const { data: businesses } = await supabase
    .from("businesses")
    .select(`
      id,
      business_name,
      status,
      created_at,
      max_staff_limit,
      allow_receipt_uploads,
      profiles ( id, full_name, email, role, max_businesses_limit )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Tenant Approvals</h2>
        <p className="text-neutral-500 mt-1">Review and approve new businesses registering for MDS Ledger.</p>
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">Registered SaaS Tenants</CardTitle>
          <CardDescription>Master list of all companies using the platform.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                <tr>
                  <th className="px-6 py-3 font-medium text-neutral-900">Business Name</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Owner Details</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Registration Date</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Status</th>
                  <th className="px-6 py-3 font-medium text-neutral-900 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {(!businesses || businesses.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                      No businesses registered yet.
                    </td>
                  </tr>
                ) : (
                  businesses.map((biz) => {
                    const isArray = Array.isArray(biz.profiles);
                    const owner = isArray 
                      ? (biz.profiles as any[]).find(p => p.role === 'business_owner') 
                      : biz.profiles;

                    // Fallback to true if the column was just created and is null
                    const hasReceipts = biz.allow_receipt_uploads !== false; 

                    return (
                      <tr key={biz.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-neutral-900">
                          {biz.business_name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-neutral-900">{owner?.full_name || 'Unknown'}</span>
                            <span className="text-xs text-neutral-500 mb-1">{owner?.email}</span>
                            {owner?.id && (
                              <ManageOrgLimitButton 
                                ownerId={owner.id} 
                                ownerName={owner.full_name || 'Unknown'} 
                                currentLimit={owner.max_businesses_limit || 1} 
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-500 text-xs">
                          {new Date(biz.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            biz.status === 'active' 
                              ? 'bg-green-50 text-green-700 border border-green-200' 
                              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          }`}>
                            {biz.status ? biz.status.toUpperCase() : 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {biz.status === 'pending' ? (
                            <form action={async (formData) => {
                              "use server";
                              await approveBusiness(formData);
                            }}>
                              <input type="hidden" name="business_id" value={biz.id} />
                              <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                Approve Tenant
                              </Button>
                            </form>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {/* THE NEW FEATURES BUTTON */}
                              <ManageFeaturesButton 
                                businessId={biz.id} 
                                businessName={biz.business_name}
                                currentReceiptStatus={hasReceipts}
                              />
                              <ManageLimitButton 
                                businessId={biz.id} 
                                businessName={biz.business_name} 
                                currentLimit={biz.max_staff_limit ?? 1} 
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}