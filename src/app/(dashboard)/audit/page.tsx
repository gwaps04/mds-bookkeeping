// src/app/(dashboard)/audit/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { ShieldAlert, FileText } from "lucide-react";

export default async function AuditTrailPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user?.id)
    .single();

  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    redirect("/dashboard"); 
  }

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select(`
      id,
      action,
      table_name,
      created_at,
      details,
      profiles (full_name, email, role)
    `)
    .eq("business_id", profile?.business_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Audit Fetch Error:", error);
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Security & Audit Trail</h2>
        <p className="text-neutral-500 mt-1">Immutable ledger of all team actions and system events.</p>
      </div>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader className="bg-neutral-900 text-white rounded-t-lg">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldAlert size={18} />
            Master Security Log
          </CardTitle>
          <CardDescription className="text-neutral-400">Restricted access. All timestamps are in UTC.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 bg-neutral-50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
              <thead className="bg-neutral-200 border-b border-neutral-300">
                <tr>
                  <th className="px-6 py-3 font-semibold text-neutral-700">Timestamp</th>
                  <th className="px-6 py-3 font-semibold text-neutral-700">Actor (User)</th>
                  <th className="px-6 py-3 font-semibold text-neutral-700">Action Type</th>
                  <th className="px-6 py-3 font-semibold text-neutral-700">Module</th>
                  <th className="px-6 py-3 font-semibold text-neutral-700 w-1/3">Remarks & Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {(!logs || logs.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      No security events logged yet. Create an invoice to test the tripwire!
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actor = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                    
                    return (
                      <tr key={log.id} className="hover:bg-neutral-50 transition-colors text-xs group">
                        <td className="px-6 py-4 text-neutral-500 font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-900">{actor?.full_name || 'System'}</span>
                            <span className="text-neutral-500">{actor?.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 tracking-wider font-mono">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-neutral-700 font-mono">
                          {log.table_name.toUpperCase()}
                        </td>
                        
                        <td className="px-6 py-4">
                          {log.details ? (
                            <div className="flex flex-col gap-2 whitespace-normal">
                              
                              {/* --- THE FIX: VISUALLY RENDERING THE INVOICE CONTEXT --- */}
                              <div className="flex flex-wrap items-center gap-2">
                                {log.details.invoice_number && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded uppercase tracking-wider font-bold shadow-sm">
                                    <FileText size={10} /> INV-#{log.details.invoice_number}
                                  </span>
                                )}
                                
                                {log.details.account_name && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-neutral-100 text-neutral-700 border border-neutral-200 px-2 py-0.5 rounded uppercase tracking-wider font-bold shadow-sm">
                                    Target: {log.details.account_name}
                                  </span>
                                )}

                                {log.details.amount_paid !== undefined && (
                                  <span className="text-[11px] font-bold text-green-700">Amount: ₱{Number(log.details.amount_paid).toLocaleString('en-US')}</span>
                                )}
                                
                                {log.details.voided_amount !== undefined && (
                                  <span className="text-[11px] font-bold text-red-700">Voided: ₱{Number(log.details.voided_amount).toLocaleString('en-US')}</span>
                                )}
                              </div>

                              {log.details.reason && (
                                <span className="text-xs text-neutral-800 break-words leading-relaxed border-l-2 border-neutral-300 pl-2">
                                  <span className="font-bold text-neutral-500 mr-1">Remark:</span>
                                  {log.details.reason}
                                </span>
                              )}
                              
                              {log.details.original_reason && (
                                <span className="text-xs text-neutral-800 break-words leading-relaxed border-l-2 border-red-300 pl-2 bg-red-50/50">
                                  <span className="font-bold text-red-800 mr-1">Staff Reason:</span>
                                  {log.details.original_reason}
                                </span>
                              )}

                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400 italic">No additional context.</span>
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