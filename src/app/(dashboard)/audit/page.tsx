// src/app/(dashboard)/audit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function AuditTrailPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get Profile & Enforce Security (Owners Only!)
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    redirect("/dashboard"); 
  }

  // 2. Fetch the Master Audit Trail
  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select(`
      id,
      action,
      table_name,
      created_at,
      profiles (full_name, email, role)
    `)
    .eq("business_id", profile?.business_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Audit Fetch Error:", error);
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Security & Audit Trail</h2>
        <p className="text-neutral-500 mt-1">Immutable ledger of all team actions and system events.</p>
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader className="bg-neutral-900 text-white rounded-t-lg">
          <CardTitle className="text-lg flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Master Security Log
          </CardTitle>
          <CardDescription className="text-neutral-400">Restricted access. All timestamps are in UTC.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 bg-neutral-50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-neutral-200 border-b border-neutral-300">
                <tr>
                  <th className="px-6 py-3 font-semibold text-neutral-700">Timestamp</th>
                  <th className="px-6 py-3 font-semibold text-neutral-700">Actor (User)</th>
                  <th className="px-6 py-3 font-semibold text-neutral-700">Action Type</th>
                  <th className="px-6 py-3 font-semibold text-neutral-700">Module</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {(!logs || logs.length === 0) ? (
                  <tr>
                    {/* Adjusted colSpan from 5 to 4 */}
                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                      No security events logged yet. Create an invoice to test the tripwire!
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actor = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                    
                    return (
                      <tr key={log.id} className="hover:bg-neutral-50 transition-colors font-mono text-xs">
                        <td className="px-6 py-4 text-neutral-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-900 font-sans">{actor?.full_name || 'System'}</span>
                            <span className="text-neutral-500">{actor?.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 tracking-wider">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-neutral-700">
                          {log.table_name.toUpperCase()}
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