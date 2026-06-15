// src/app/(dashboard)/team/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { inviteStaff } from "@/features/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id")
    .eq("id", user?.id)
    .single();

  // Strict Routing Guard: Only Business Owners can access this page
  if (profile?.role !== "business_owner") {
    redirect("/dashboard");
  }

  // Fetch current staff members
  const { data: staffMembers } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .eq("business_id", profile.business_id)
    .neq("id", user?.id) // Don't show the owner in the staff list
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Team Management</h2>
        <p className="text-neutral-500 mt-1">Invite bookkeepers or staff to manage your ledger.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {/* FORM COLUMN */}
        <div className="md:col-span-1">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader>
              <CardTitle className="text-lg">Provision Staff</CardTitle>
              <CardDescription>Create a write-only access account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                "use server";
                await inviteStaff(formData);
              }} className="space-y-4">
                
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" name="full_name" placeholder="e.g. Jane Smith" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" placeholder="jane@company.com" required />
                </div>

                <div className="bg-neutral-50 p-3 rounded-md text-sm text-neutral-600 border border-neutral-200">
                  <p className="font-medium text-neutral-900 mb-1">Temporary Credential</p>
                  <p>The user will be provisioned with the password: <code className="bg-neutral-200 px-1 rounded">StaffPassword123!</code></p>
                </div>

                <Button type="submit" className="w-full">Provision Account</Button>
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
                  <th className="px-6 py-4 font-medium text-neutral-900">Team Member</th>
                  <th className="px-6 py-4 font-medium text-neutral-900">Role</th>
                  <th className="px-6 py-4 font-medium text-neutral-900 text-right">Added On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {staffMembers?.map((staff) => (
                  <tr key={staff.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900">{staff.full_name || 'Pending...'}</div>
                      <div className="text-neutral-500">{staff.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-neutral-100 text-neutral-600">
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-neutral-500">
                      {new Date(staff.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                
                {(!staffMembers || staffMembers.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-neutral-500">
                      No staff members found. Provision an account to delegate access.
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