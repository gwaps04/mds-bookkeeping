// src/app/(dashboard)/admin/businesses/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import ManageLimitButton from "./ManageLimitButton"; 
import ManageOrgLimitButton from "./ManageOrgLimitButton"; 
import ManageFeaturesButton from "./ManageFeaturesButton";
import ApproveTenantDialog from "./ApproveTenantDialog";
// THE NEW IMPORT
import ManageBillingDialog from "./ManageBillingDialog";

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

  const { data: businesses } = await supabase
    .from("businesses")
    .select(`
      id,
      business_name,
      status,
      subscription_status,
      subscription_tier,
      trial_ends_at,
      created_at,
      max_staff_limit,
      allow_receipt_uploads,
      profiles ( id, full_name, email, role, max_businesses_limit )
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Tenant & Billing Orchestration</h2>
        <p className="text-neutral-500 mt-1">Review, approve, and manage SaaS subscriptions for all platform organizations.</p>
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100">
          <CardTitle className="text-lg">Registered SaaS Tenants</CardTitle>
          <CardDescription>Master list of all companies and their active billing states.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Business Name</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Owner Details</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Plan & Billing</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">System Status</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(!businesses || businesses.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      No businesses registered yet.
                    </td>
                  </tr>
                ) : (
                  businesses.map((biz) => {
                    const isArray = Array.isArray(biz.profiles);
                    const owner = isArray 
                      ? (biz.profiles as any[]).find(p => p.role === 'business_owner') 
                      : biz.profiles;

                    const hasReceipts = biz.allow_receipt_uploads !== false; 
                    
                    // State Machine Visual Logic
                    const subStatus = biz.subscription_status || 'trial';
                    const isTrial = subStatus === 'trial';
                    const isActive = subStatus === 'active';
                    const isSuspended = subStatus === 'suspended';
                    const isCanceled = subStatus === 'canceled';
                    const isPastDue = subStatus === 'past_due';

                    // Calculate Semantic Badge Colors
                    let badgeColor = "bg-neutral-100 text-neutral-700 border-neutral-200";
                    if (isTrial) badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                    if (isActive) badgeColor = "bg-green-50 text-green-700 border-green-200";
                    if (isPastDue) badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                    if (isSuspended || isCanceled) badgeColor = "bg-red-50 text-red-700 border-red-200";

                    return (
                      <tr key={biz.id} className="hover:bg-neutral-50/80 transition-colors group">
                        
                        <td className="px-6 py-4">
                          <p className="font-bold text-neutral-900">{biz.business_name}</p>
                          <p className="text-xs text-neutral-400 mt-1 font-mono">ID: {biz.id.split('-')[0]}</p>
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

                        <td className="px-6 py-4">
                          {biz.status === 'pending' ? (
                            <span className="text-xs text-neutral-400 italic">Awaiting Provisioning</span>
                          ) : (
                            <div className="flex flex-col items-start gap-1.5">
                              <div className="flex gap-2 items-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-white shadow-sm">
                                  {biz.subscription_tier || 'ESSENTIAL'}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                                  {subStatus}
                                </span>
                              </div>
                              
                              {isTrial && biz.trial_ends_at && (
                                <span className="text-[11px] font-medium text-blue-600 mt-1 flex items-center gap-1">
                                  Expires: {new Date(biz.trial_ends_at).toLocaleDateString()}
                                </span>
                              )}
                              {isActive && (
                                <span className="text-[11px] font-medium text-green-600 mt-1">
                                  Good Standing
                                </span>
                              )}
                              {(isSuspended || isCanceled || isPastDue) && (
                                <span className="text-[11px] font-medium text-red-600 mt-1">
                                  Account Soft-Locked
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            biz.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${biz.status === 'active' ? 'bg-green-500' : 'bg-neutral-400'}`}></span>
                            {biz.status ? biz.status : 'UNKNOWN'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          {biz.status === 'pending' ? (
                            <ApproveTenantDialog businessId={biz.id} businessName={biz.business_name} />
                          ) : (
                            // THE FIX: Removed opacity constraints. Actions are permanently visible.
                            <div className="flex items-center justify-end gap-2 flex-wrap max-w-[280px] ml-auto">
                              
                              <ManageBillingDialog 
                                businessId={biz.id} 
                                businessName={biz.business_name}
                                currentStatus={subStatus}
                              />
                              
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