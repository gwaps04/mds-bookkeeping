// src/app/(dashboard)/payroll/employees/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import AddEmployeeDialog from "./AddEmployeeDialog";
import EditEmployeeDialog from "./EditEmployeeDialog";
import { Search, Users, CheckCircle2, ShieldOff, Trash2 } from "lucide-react";
import { deleteEmployee } from "@/features/payroll/actions";

export default async function EmployeeDirectoryPage(props: { searchParams: Promise<{ search?: string, type?: string }> }) {
  const params = await props.searchParams;
  const searchStr = params?.search?.toLowerCase() || '';
  const typeFilter = params?.type || 'ALL';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id, businesses(currency)").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // 1. FILTER & SORT: Added filter and changed order to latest first!
  let query = supabase
    .from("employees")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (typeFilter !== 'ALL') query = query.eq("pay_type", typeFilter);
  if (searchStr) query = query.or(`first_name.ilike.%${searchStr}%,last_name.ilike.%${searchStr}%,position.ilike.%${searchStr}%`);

  const { data: employees } = await query;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  const formatPayType = (type: string) => type.replace('_', ' ');

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">Employee Directory</h2>
          <p className="text-sm md:text-base text-neutral-500 mt-1">Manage your team, compensation rates, and compliance profiles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/payroll"><Button variant="outline" className="bg-white">Payroll Hub</Button></Link>
          <AddEmployeeDialog />
        </div>
      </div>

      {/* 2. ENHANCED SEARCH & FILTER BAR */}
      <form method="GET" className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-neutral-200 w-full md:max-w-2xl">
        <div className="flex items-center w-full sm:w-auto flex-1">
          <Search className="w-5 h-5 text-neutral-400 ml-2" />
          <Input name="search" placeholder="Search name or position..." defaultValue={searchStr} className="border-none shadow-none focus-visible:ring-0 text-base w-full" />
        </div>
        <div className="flex w-full sm:w-auto gap-2 border-t sm:border-t-0 sm:border-l border-neutral-100 pt-2 sm:pt-0 sm:pl-2">
          <Select name="type" defaultValue={typeFilter}>
            <SelectTrigger className="w-full sm:w-[140px] border-none shadow-none bg-neutral-50"><SelectValue placeholder="Pay Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="FIXED_SALARY">Fixed Salary</SelectItem>
              <SelectItem value="HOURLY">Hourly Rate</SelectItem>
              <SelectItem value="COMMISSION">Commission</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="bg-neutral-900 text-white hover:bg-neutral-800 shrink-0">Filter</Button>
        </div>
      </form>

      <Card className="shadow-sm border-neutral-200 overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4">
          <CardTitle className="text-lg flex items-center gap-2"><Users size={18} className="text-neutral-500" /> Active Staff</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
            <thead className="bg-white border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-neutral-600">Employee Details</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">Compensation</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">Compliance</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {(!employees || employees.length === 0) ? (
                <tr><td colSpan={4} className="px-6 py-16 text-center text-neutral-500">No employees found.</td></tr>
              ) : (
                employees.map((emp) => {
                  const hasZeroCompliance = !emp.sss_enabled && !emp.philhealth_enabled && !emp.pagibig_enabled && !emp.tax_enabled;

                  return (
                    <tr key={emp.id} className="hover:bg-neutral-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 text-base">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-neutral-500 font-medium">{emp.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-neutral-900">{formatCurrency(Number(emp.base_rate))}</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1">
                          {formatPayType(emp.pay_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {hasZeroCompliance ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200"><ShieldOff size={12} /> Informal</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {emp.sss_enabled && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">SSS</span>}
                            {emp.philhealth_enabled && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">PHIC</span>}
                            {emp.pagibig_enabled && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">HDMF</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {/* 3. EDIT & DELETE ACTIONS */}
                        <div className="flex items-center justify-end gap-1">
                          <EditEmployeeDialog employee={emp} />
                          <form action={async () => { "use server"; const fd = new FormData(); fd.append('id', emp.id); await deleteEmployee(fd); }}>
                            <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}