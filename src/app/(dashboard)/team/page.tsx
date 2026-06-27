// src/app/(dashboard)/team/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { ProvisionStaffForm, ResetPasswordButton } from "./TeamForms";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get Business ID, Enforce Security, and Fetch Dynamic Limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role, businesses(max_staff_limit)")
    .eq("id", user?.id)
    .single();

  // Kick out anyone who isn't the owner or super admin
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    redirect("/dashboard");
  }

  const businessId = profile?.business_id;

  // Resolve the dynamic limit set by the Super Admin
  const maxLimit = Array.isArray(profile?.businesses) 
    ? profile?.businesses[0]?.max_staff_limit 
    : (profile?.businesses as any)?.max_staff_limit;
  
  const allowedLimit = maxLimit ?? 1; // Default to 1 if not set

  // 2. Fetch all active team members
  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });

  // 3. UI LIMIT CHECK
  const staffCount = teamMembers?.filter(m => m.role === 'staff').length || 0;
  const hasRemainingQuota = staffCount < allowedLimit;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER WITH DYNAMIC USAGE BADGE */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Team Management</h2>
          <p className="text-neutral-500 mt-1">Onboard staff and manage their access to your ledger.</p>
        </div>
        
        <div className={`px-4 py-2 rounded-full border text-sm font-bold shadow-sm ${
          hasRemainingQuota 
            ? 'bg-blue-50 border-blue-200 text-blue-700' 
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          Usage: {staffCount} of {allowedLimit} Staff Slots Used
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        
        {/* INVITE STAFF FORM */}
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200 sticky top-8">
            <CardHeader>
              <CardTitle className="text-lg">Create Staff Account</CardTitle>
              <CardDescription>Instantly provision an account for a new employee.</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasRemainingQuota ? (
                <div className="bg-red-50 p-4 rounded-md border border-red-100 text-sm text-red-800 text-center">
                  <p className="font-semibold text-red-900">Plan Limit Reached</p>
                  <p className="mt-1">You are currently limited to {allowedLimit} staff member(s). Please remove an existing member or contact a Super Admin to upgrade.</p>
                </div>
              ) : (
                <ProvisionStaffForm />
              )}
            </CardContent>
          </Card>
        </div>

        {/* ACTIVE TEAM DIRECTORY */}
        <div className="md:col-span-2">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg">Active Roster</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                    <tr>
                      <th className="px-6 py-3 font-medium text-neutral-900">Name / Email</th>
                      <th className="px-6 py-3 font-medium text-neutral-900">Role</th>
                      <th className="px-6 py-3 font-medium text-neutral-900">Joined</th>
                      <th className="px-6 py-3 font-medium text-neutral-900 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {(!teamMembers || teamMembers.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                          No team members found.
                        </td>
                      </tr>
                    ) : (
                      teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                {(member.full_name || member.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-neutral-900">{member.full_name || 'Pending Name'}</span>
                                <span className="text-xs text-neutral-500">{member.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.role === 'business_owner' 
                                ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {member.role === 'business_owner' ? 'Owner' : 'Staff'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-neutral-500 text-xs">
                            {new Date(member.created_at).toLocaleDateString()}
                          </td>
                          
                          {/* SECURE PASSWORD RESET BUTTON */}
                          <td className="px-6 py-4 text-right">
                            {member.role === 'staff' && (
                              <ResetPasswordButton userId={member.id} email={member.email} />
                            )}
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