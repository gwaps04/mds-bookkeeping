// src/app/(dashboard)/payroll/employees/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import AddEmployeeDialog from "./AddEmployeeDialog";
import EditEmployeeDialog from "./EditEmployeeDialog";
import { Search, Users, ShieldOff, Trash2 } from "lucide-react";
import { deleteEmployee } from "@/features/payroll/actions";

import TablePagination from "@/components/TablePagination";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmployeeDirectoryPage(props: { 
  searchParams: Promise<{ search?: string, type?: string, page?: string }> 
}) {
  const params = await props.searchParams;
  const searchStr = params?.search?.toLowerCase() || '';
  const typeFilter = params?.type || 'ALL';

  const ITEMS_PER_PAGE = 50;
  const currentPage = parseInt(params?.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id, businesses(currency)").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  let query = supabase
    .from("employees")
    .select("*", { count: 'exact' })
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (typeFilter !== 'ALL') query = query.eq("pay_type", typeFilter);
  if (searchStr) query = query.or(`first_name.ilike.%${searchStr}%,last_name.ilike.%${searchStr}%,position.ilike.%${searchStr}%`);

  query = query.range(from, to);

  const { data: employees, count } = await query;
  const totalItems = count || 0;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  const formatPayType = (type: string) => type.replace('_', ' ');

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0 overflow-x-hidden pb-12">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
        <div className="w-full min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Employee Directory</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Manage your team, compensation rates, and compliance profiles.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Link href="/payroll" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto bg-white font-bold shadow-sm transition-colors hover:bg-neutral-50">
              Payroll Hub
            </Button>
          </Link>
          <div className="flex-1 sm:flex-none">
            <AddEmployeeDialog />
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-neutral-200 bg-white w-full min-w-0">
        <CardContent className="p-4 md:p-5">
          <form method="GET" className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-end w-full">
            
            <input type="hidden" name="page" value="1" />

            <div className="flex-1 w-full min-w-[200px] space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Search Directory</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <Input name="search" placeholder="Search name or position..." defaultValue={searchStr} className="pl-9 bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900 w-full" />
              </div>
            </div>

            <div className="w-full sm:w-auto min-w-[160px] space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Compensation Type</label>
              <Select name="type" defaultValue={typeFilter}>
                <SelectTrigger className="bg-neutral-50 border-neutral-200 w-full"><SelectValue placeholder="Pay Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="FIXED_SALARY">Fixed Salary</SelectItem>
                  <SelectItem value="HOURLY">Hourly Rate</SelectItem>
                  <SelectItem value="COMMISSION">Commission</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button type="submit" className="bg-neutral-900 text-white flex-1 sm:flex-none shadow-sm transition-all hover:bg-neutral-800">Filter</Button>
              {(searchStr || typeFilter !== 'ALL') && (
                <Link href="/payroll/employees" className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button>
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-neutral-200 overflow-hidden flex flex-col bg-white w-full min-w-0">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 shrink-0">
          <CardTitle className="text-lg flex items-center gap-2"><Users size={18} className="text-neutral-500" /> Active Staff</CardTitle>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 w-full overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm table-auto">
              <thead className="bg-white border-b border-neutral-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] w-full">Employee Details</th>
                  <th className="hidden sm:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Compensation</th>
                  <th className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Compliance</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {(!employees || employees.length === 0) ? (
                  <tr><td colSpan={4} className="px-6 py-16 text-center text-neutral-500">No employees found matching your criteria.</td></tr>
                ) : (
                  employees.map((emp) => {
                    const hasZeroCompliance = !emp.sss_enabled && !emp.philhealth_enabled && !emp.pagibig_enabled && !emp.tax_enabled;

                    const compBlock = (
                      <div className="flex flex-col items-start">
                        <p className="font-bold text-neutral-900 text-sm">{formatCurrency(Number(emp.base_rate))}</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1 shadow-sm">
                          {formatPayType(emp.pay_type)}
                        </span>
                      </div>
                    );

                    const complianceBlock = hasZeroCompliance ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-sm"><ShieldOff size={10} /> Informal</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {emp.sss_enabled && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">SSS</span>}
                        {emp.philhealth_enabled && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">PHIC</span>}
                        {emp.pagibig_enabled && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">HDMF</span>}
                      </div>
                    );

                    return (
                      <tr key={emp.id} className="hover:bg-neutral-50/60 transition-colors group">
                        
                        <td className="px-4 sm:px-6 py-4 whitespace-normal break-words w-full min-w-[200px] align-top sm:align-middle">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm mt-0.5 sm:mt-0">
                              {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                            </div>
                            <div className="min-w-0 w-full flex-1">
                              <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight">{emp.first_name} {emp.last_name}</p>
                              <p className="text-[11px] sm:text-xs text-neutral-500 font-medium mt-0.5">{emp.position}</p>
                              
                              <div className="flex flex-col gap-3 mt-3 sm:hidden border-t border-neutral-100 pt-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Pay</p>
                                    {compBlock}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1 text-right">Compliance</p>
                                    <div className="flex justify-end">
                                      {complianceBlock}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="hidden sm:block md:hidden mt-3 border-t border-neutral-100 pt-2 w-fit">
                                {complianceBlock}
                              </div>

                            </div>
                          </div>
                        </td>
                        
                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 align-middle whitespace-nowrap">
                          {compBlock}
                        </td>
                        
                        <td className="hidden md:table-cell px-4 sm:px-6 py-4 align-middle whitespace-nowrap">
                          {complianceBlock}
                        </td>
                        
                        <td className="px-4 sm:px-6 py-4 text-right align-top sm:align-middle whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 sm:gap-2 mt-1 sm:mt-0">
                            <EditEmployeeDialog employee={emp} />
                            <form action={async () => { "use server"; const fd = new FormData(); fd.append('id', emp.id); await deleteEmployee(fd); }}>
                              <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded-md">
                                <Trash2 size={16} />
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
        </CardContent>

        <TablePagination 
          totalItems={totalItems} 
          itemsPerPage={ITEMS_PER_PAGE} 
          currentPage={currentPage} 
        />
      </Card>
    </div>
  );
}