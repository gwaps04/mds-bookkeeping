// src/app/(dashboard)/payroll/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation"; // THE FIX: Added redirect import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import NewRunDialog from "./NewRunDialog";
import TablePagination from "@/components/TablePagination"; 
import { Calculator, Users, Clock, FileText, CheckCircle2, AlertCircle, CalendarRange, Search } from "lucide-react"; 

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PayrollHubPage(props: { searchParams: Promise<{ search?: string, status?: string, page?: string }> }) {
  const params = await props.searchParams;
  const searchStr = params?.search || '';
  const statusFilter = params?.status || 'ALL';
  
  const ITEMS_PER_PAGE = 50;
  const currentPage = parseInt(params?.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // THE FIX: Upgraded query to fetch the Two-Key RBAC flags
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, can_access_payroll, business_id, businesses(currency, has_payroll_access)")
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // ============================================================================
  // THE HARD GUARD: SERVER-SIDE ROUTE PROTECTION
  // ============================================================================
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';
  const bizHasPayroll = bizData?.has_payroll_access === true;

  // Key 1: If the business doesn't pay for the module, kick EVERYONE out.
  if (!bizHasPayroll && !isSuperAdmin(profile?.role)) {
    redirect("/dashboard");
  }

  // Key 2: If the user is a staff member WITHOUT explicit HR clearance, kick them out.
  if (!isOwner && profile?.can_access_payroll !== true) {
    redirect("/dashboard");
  }
  // ============================================================================

  let query = supabase
    .from("payroll_runs")
    .select(`
      id, period_start, period_end, run_date, status, created_at,
      payslips ( id, gross_pay, net_pay )
    `, { count: 'exact' })
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (statusFilter !== 'ALL') {
    query = query.eq("status", statusFilter);
  }

  if (searchStr) {
    query = query.or(`period_start.ilike.%${searchStr}%,period_end.ilike.%${searchStr}%,run_date.ilike.%${searchStr}%`);
  }

  query = query.range(from, to);

  const { data: rawPayrollRuns, count } = await query;
  const payrollRuns = rawPayrollRuns || [];
  const totalItems = count || 0;

  const { count: activeEmployees } = await supabase.from("employees").select("*", { count: 'exact', head: true }).eq("business_id", businessId).eq("is_active", true);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  // Helper function for the guard
  function isSuperAdmin(role?: string) {
    return role === 'super_admin';
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12 w-full min-w-0 overflow-x-hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
        <div className="min-w-0 w-full flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Payroll Hub</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Generate payslips, track disbursements, and review draft cycles.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Link href="/payroll/employees" className="flex-1 sm:flex-none">
            <Button variant="outline" className="bg-white w-full sm:w-auto font-semibold">
              <Users size={16} className="mr-2" /> Directory
            </Button>
          </Link>
          <div className="flex-1 sm:flex-none">
            <NewRunDialog />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        <Card className="shadow-sm border-neutral-200 bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 shadow-sm">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Active Staff Employees</p>
              <p className="text-xl sm:text-2xl font-black text-neutral-900 mt-0.5">{activeEmployees || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <form method="GET" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white p-2 rounded-lg shadow-sm border border-neutral-200 w-full lg:max-w-2xl min-w-0">
        <div className="flex items-center flex-1 min-w-0 bg-neutral-50 sm:bg-transparent rounded-md sm:rounded-none px-2 sm:px-0">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <Input 
            name="search" 
            placeholder="Search Date (e.g. 2026)..." 
            defaultValue={searchStr} 
            className="border-none shadow-none focus-visible:ring-0 text-sm sm:text-base w-full bg-transparent h-10" 
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-neutral-100 pt-2.5 sm:pt-0 sm:pl-2.5 shrink-0">
          <Select name="status" defaultValue={statusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] border-none shadow-none bg-neutral-50 h-10 focus:ring-neutral-900">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Cycles</SelectItem>
              <SelectItem value="DRAFT">Pending Drafts</SelectItem>
              <SelectItem value="FINALIZED">Awaiting Payout</SelectItem>
              <SelectItem value="PAID">Disbursed</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="page" value="1" />
          <Button type="submit" className="bg-neutral-900 text-white hover:bg-neutral-800 shrink-0 px-5 font-bold h-10 shadow-sm">Filter</Button>
        </div>
      </form>

      <Card className="shadow-sm border-neutral-200 overflow-hidden flex flex-col bg-white w-full min-w-0">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator size={18} className="text-neutral-500" /> Payroll History
          </CardTitle>
          <CardDescription>Review drafts, finalized calculations, and posted payouts.</CardDescription>
        </CardHeader>
        
        <div className="overflow-x-auto flex-1 w-full">
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-white border-b border-neutral-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] w-full">Pay Period Details</th>
                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Payout Date</th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-center whitespace-nowrap">Status</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap">Total Net Pay</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {payrollRuns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-neutral-50 text-neutral-400 rounded-full shadow-inner"><FileText size={32} /></div>
                      <h3 className="text-lg font-bold text-neutral-900">No Payroll Runs Found</h3>
                      <p className="text-sm text-neutral-500">Try adjusting your search filters or generate a new cycle.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payrollRuns.map((run) => {
                  const slips = run.payslips as any[];
                  const totalNet = slips.reduce((sum, slip) => sum + Number(slip.net_pay), 0);
                  const employeeCount = slips.length;

                  const statusBadge = (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border shadow-sm
                      ${run.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                        run.status === 'FINALIZED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {run.status === 'DRAFT' && <Clock size={10} className="shrink-0" />}
                      {run.status === 'FINALIZED' && <AlertCircle size={10} className="shrink-0" />}
                      {run.status === 'PAID' && <CheckCircle2 size={10} className="shrink-0" />}
                      {run.status === 'DRAFT' ? 'Draft' : run.status === 'FINALIZED' ? 'Finalized' : 'Disbursed'}
                    </span>
                  );

                  return (
                    <tr key={run.id} className="hover:bg-neutral-50/60 transition-colors group">
                      <td className="px-4 sm:px-6 py-4 whitespace-normal break-words w-full min-w-[150px] align-middle">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-100 text-neutral-400 shrink-0 hidden xs:block shadow-sm">
                            <CalendarRange size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight">
                              {new Date(run.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(run.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-neutral-400 font-bold tracking-wide mt-1">{employeeCount} Workers Mapped</p>
                            
                            <div className="flex flex-col gap-1.5 mt-2 sm:hidden">
                              <p className="text-[11px] text-neutral-500 font-medium">
                                Payout: {new Date(run.run_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <div className="md:hidden w-fit">
                                {statusBadge}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4 font-medium text-neutral-600 text-xs sm:text-sm align-middle whitespace-nowrap">
                        {new Date(run.run_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-center align-middle whitespace-nowrap">
                        {statusBadge}
                      </td>

                      <td className="px-4 sm:px-6 py-4 text-right align-middle whitespace-nowrap">
                        <p className="font-black text-neutral-900 text-sm sm:text-base tracking-tight">{formatCurrency(totalNet)}</p>
                        <div className="hidden sm:block md:hidden mt-1.5">
                          {statusBadge}
                        </div>
                      </td>

                      <td className="px-4 sm:px-6 py-4 text-center align-middle whitespace-nowrap">
                        <div className="flex flex-col sm:flex-row items-center justify-center w-full min-w-0">
                          <Link href={`/payroll/${run.id}`} className="w-full sm:w-auto">
                            <Button 
                              variant={run.status === 'DRAFT' ? "default" : "outline"} 
                              size="sm" 
                              className={`w-full sm:w-auto h-8 sm:h-9 px-4 text-xs font-bold transition-all shadow-sm
                                ${run.status === 'DRAFT' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'}`}
                            >
                              {run.status === 'DRAFT' ? 'Review Draft' : 'View Details'}
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <TablePagination 
          totalItems={totalItems} 
          itemsPerPage={ITEMS_PER_PAGE} 
          currentPage={currentPage} 
        />
      </Card>
    </div>
  );
}