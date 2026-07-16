// src/app/(dashboard)/payroll/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, can_access_payroll, business_id, businesses(currency, has_payroll_access)")
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // ============================================================================
  // SERVER-SIDE ROUTE PROTECTION
  // ============================================================================
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';
  const bizHasPayroll = bizData?.has_payroll_access === true;

  function isSuperAdmin(role?: string) {
    return role === 'super_admin';
  }

  if (!bizHasPayroll && !isSuperAdmin(profile?.role)) redirect("/dashboard");
  if (!isOwner && profile?.can_access_payroll !== true) redirect("/dashboard");

  // ============================================================================
  // PARALLEL DATA FETCHING (PROMISE.ALL)
  // ============================================================================
  let query = supabase
    .from("payroll_runs")
    .select(`
      id, period_start, period_end, run_date, status, created_at,
      payslips ( id, gross_pay, net_pay )
    `, { count: 'exact' })
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (statusFilter !== 'ALL') query = query.eq("status", statusFilter);
  if (searchStr) query = query.or(`period_start.ilike.%${searchStr}%,period_end.ilike.%${searchStr}%,run_date.ilike.%${searchStr}%`);
  
  query = query.range(from, to);

  const [
    { data: rawPayrollRuns, count },
    { count: activeEmployees }
  ] = await Promise.all([
    query,
    supabase.from("employees").select("*", { count: 'exact', head: true }).eq("business_id", businessId).eq("is_active", true)
  ]);

  const payrollRuns = rawPayrollRuns || [];
  const totalItems = count || 0;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12 w-full min-w-0 overflow-x-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
        <div className="min-w-0 w-full flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Payroll Hub</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Generate payslips, track disbursements, and review draft cycles.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <Link href="/payroll/employees" className="flex-1 sm:flex-none">
            <Button variant="outline" className="bg-white w-full sm:w-auto font-semibold h-11 sm:h-10 border-neutral-200">
              <Users size={16} className="mr-2 text-neutral-500" /> Directory
            </Button>
          </Link>
          <div className="flex-1 sm:flex-none">
            <NewRunDialog />
          </div>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <Card className="shadow-sm border-neutral-200 bg-white">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 shadow-sm">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Active Employees</p>
              <p className="text-2xl font-black text-neutral-900 tracking-tight leading-none mt-1">{activeEmployees || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FLUID FILTER FORM */}
      <form method="GET" className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-neutral-200 w-full mb-2">
        <div className="relative flex-1 min-w-0 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-indigo-600 transition-colors" />
          <Input 
            name="search" 
            placeholder="Search dates (e.g. 2026)..." 
            defaultValue={searchStr} 
            className="pl-10 border-neutral-200 shadow-none focus-visible:ring-indigo-600 focus-visible:border-indigo-600 text-sm h-11 bg-neutral-50 hover:bg-neutral-100 transition-colors" 
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
          <Select name="status" defaultValue={statusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] border-neutral-200 shadow-none h-11 bg-neutral-50 hover:bg-neutral-100 transition-colors focus:ring-indigo-600">
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
          <Button type="submit" className="bg-neutral-900 text-white hover:bg-neutral-800 shrink-0 px-6 font-bold h-11 shadow-sm w-full sm:w-auto">
            Apply Filters
          </Button>
        </div>
      </form>

      {/* THE FIX: CSS GRID LIST WITH DELAYED BREAKPOINTS (lg instead of md) */}
      <Card className="shadow-sm border-neutral-200 overflow-hidden flex flex-col bg-white w-full min-w-0">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 lg:py-5 shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator size={18} className="text-neutral-500" /> Payroll History
          </CardTitle>
          <CardDescription>Review drafts, finalized calculations, and posted payouts.</CardDescription>
        </CardHeader>
        
        <div className="flex-1 w-full bg-neutral-50/30">
          {payrollRuns.length === 0 ? (
            <div className="px-6 py-20 text-center flex flex-col items-center justify-center space-y-4 bg-white">
              <div className="p-5 bg-neutral-50 text-neutral-400 rounded-full shadow-inner border border-neutral-100"><FileText size={32} /></div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">No Payroll Runs Found</h3>
                <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">Adjust your search filters or click "Run Payroll" to generate a new cycle.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-neutral-100/80">
              
              {/* DESKTOP HEADER ROW (Hidden on Mobile AND Tablet) */}
              <div className="hidden lg:grid grid-cols-[2fr_1fr_1fr_1.5fr_140px] xl:grid-cols-[2.5fr_1fr_1fr_1.5fr_160px] gap-4 px-6 py-3 bg-white border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider items-center">
                <div>Pay Period Details</div>
                <div>Payout Date</div>
                <div>Status</div>
                <div className="text-right">Total Net Pay</div>
                <div className="text-center">Actions</div>
              </div>

              {/* DATA ROWS (Fluid layout) */}
              {payrollRuns.map((run) => {
                const slips = run.payslips as any[];
                const totalNet = slips.reduce((sum, slip) => sum + Number(slip.net_pay), 0);
                const employeeCount = slips.length;

                const statusBadge = (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm w-fit
                    ${run.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                      run.status === 'FINALIZED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {run.status === 'DRAFT' && <Clock size={12} className="shrink-0" />}
                    {run.status === 'FINALIZED' && <AlertCircle size={12} className="shrink-0" />}
                    {run.status === 'PAID' && <CheckCircle2 size={12} className="shrink-0" />}
                    {run.status === 'DRAFT' ? 'Draft' : run.status === 'FINALIZED' ? 'Finalized' : 'Disbursed'}
                  </span>
                );

                return (
                  <div key={run.id} className="relative grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1.5fr_140px] xl:grid-cols-[2.5fr_1fr_1fr_1.5fr_160px] gap-y-3 gap-x-4 px-5 py-5 lg:py-4 bg-white hover:bg-neutral-50/80 transition-colors items-start lg:items-center group">
                    
                    {/* MOBILE TOP BAR (Status & Pay) */}
                    <div className="flex justify-between items-start lg:hidden w-full mb-1">
                      {statusBadge}
                      <span className="font-black text-lg text-neutral-900 tracking-tight">{formatCurrency(totalNet)}</span>
                    </div>

                    {/* PERIOD DETAILS */}
                    <div className="flex items-start lg:items-center gap-3.5 w-full min-w-0">
                      <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-500 shrink-0 hidden sm:flex shadow-sm border border-neutral-200/60">
                        <CalendarRange size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight break-words">
                          {new Date(run.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(run.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-neutral-500 font-semibold tracking-wide mt-1 bg-neutral-100 inline-block px-1.5 py-0.5 rounded-md border border-neutral-200/50">
                          {employeeCount} Workers
                        </p>
                        
                        {/* Mobile-Only Payout Date */}
                        <p className="lg:hidden text-xs text-neutral-500 mt-2 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
                          Payout: {new Date(run.run_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* DESKTOP PAYOUT DATE */}
                    <div className="hidden lg:block text-sm text-neutral-600 font-medium">
                      {new Date(run.run_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {/* DESKTOP STATUS */}
                    <div className="hidden lg:block">
                      {statusBadge}
                    </div>

                    {/* DESKTOP NET PAY */}
                    <div className="hidden lg:block text-right">
                      <p className="font-black text-neutral-900 text-base lg:text-lg tracking-tight">{formatCurrency(totalNet)}</p>
                    </div>

                    {/* ACTIONS BUTTON */}
                    <div className="w-full lg:text-right mt-2 lg:mt-0 pt-3 lg:pt-0 border-t border-neutral-100 lg:border-0">
                      <Link href={`/payroll/${run.id}`} className="block w-full">
                        <Button 
                          variant={run.status === 'DRAFT' ? "default" : "outline"} 
                          className={`w-full lg:w-full h-11 lg:h-9 text-sm font-bold transition-all shadow-sm
                            ${run.status === 'DRAFT' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'}`}
                        >
                          {run.status === 'DRAFT' ? 'Review Draft' : 'View Details'}
                        </Button>
                      </Link>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* PAGINATION */}
        <div className="border-t border-neutral-200 bg-neutral-50/50 px-4 py-3">
          <TablePagination totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} />
        </div>
      </Card>
    </div>
  );
}