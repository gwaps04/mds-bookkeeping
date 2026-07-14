// src/app/(dashboard)/team/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { ProvisionStaffForm, ResetPasswordButton, EditPermissionsButton } from "./TeamForms";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      business_id, 
      role, 
      businesses(
        max_staff_limit, 
        has_inventory_access, 
        has_payroll_access,
        is_tax_registered
      )
    `)
    .eq("id", user?.id)
    .single();

  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    redirect("/dashboard");
  }

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;

  const maxLimit = bizData?.max_staff_limit ?? 1;
  const allowedLimit = maxLimit;
  
  // ============================================================================
  // THE FIX 1: Extract boolean states for the UI Forms
  // ============================================================================
  const hasInventory = bizData?.has_inventory_access === true;
  const hasPayroll = bizData?.has_payroll_access === true;
  const hasTaxes = bizData?.is_tax_registered === true;

  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at, can_access_inventory, can_access_expenses, can_access_taxes, can_access_payroll")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  const staffCount = teamMembers?.filter(m => m.role === 'staff').length || 0;
  const hasRemainingQuota = staffCount < allowedLimit;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 text-balance">Team Management</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Onboard staff and manage their access to your ledger.</p>
        </div>
        
        <div className={`px-4 py-2 rounded-full border text-xs sm:text-sm font-bold shadow-sm self-start md:self-auto ${
          hasRemainingQuota 
            ? 'bg-blue-50 border-blue-200 text-blue-700' 
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          Usage: {staffCount} of {allowedLimit} Staff Slots Used
        </div>
      </div>

      <div className="grid gap-6 md:gap-8 md:grid-cols-3 items-start">
        
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200 md:sticky md:top-8">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
              <CardTitle className="text-lg font-bold">Create Staff Account</CardTitle>
              <CardDescription>Instantly provision an account for a new employee.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              {!hasRemainingQuota ? (
                <div className="bg-red-50 p-4 rounded-md border border-red-100 text-sm text-red-800 text-center">
                  <p className="font-semibold text-red-900">Plan Limit Reached</p>
                  <p className="mt-1 leading-relaxed text-xs">You are currently limited to {allowedLimit} staff member(s). Please remove an existing member or contact a Super Admin to upgrade.</p>
                </div>
              ) : (
                <ProvisionStaffForm 
                  hasInventory={hasInventory} 
                  hasPayroll={hasPayroll} 
                  hasTaxes={hasTaxes} 
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-sm border-neutral-200 flex flex-col overflow-hidden">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4">
              <CardTitle className="text-lg font-bold">Active Roster</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                  <thead className="bg-white border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px]">Name / Email</th>
                      <th className="px-6 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px]">Role</th>
                      <th className="px-6 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px]">Joined</th>
                      <th className="px-6 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {(!teamMembers || teamMembers.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                          No team members found.
                        </td>
                      </tr>
                    ) : (
                      teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-neutral-50/60 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-9 w-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-neutral-900 text-sm truncate">{member.full_name || 'Pending Name'}</span>
                                <span className="text-[11px] text-neutral-500 truncate mt-0.5">{member.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm border ${
                              member.role === 'business_owner' 
                                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {member.role === 'business_owner' ? 'Owner' : 'Staff'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-neutral-500 text-xs font-medium">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {member.role === 'staff' && (
                                <>
                                  {/* THE FIX 2: Pass the boolean flags into the Edit Modal */}
                                  <EditPermissionsButton 
                                    staff={member as any} 
                                    hasInventory={hasInventory} 
                                    hasPayroll={hasPayroll} 
                                    hasTaxes={hasTaxes} 
                                  />
                                  <ResetPasswordButton userId={member.id} email={member.email} />
                                </>
                              )}
                            </div>
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
    </div>
  );
}