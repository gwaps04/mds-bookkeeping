// src/app/(dashboard)/payroll/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import NewRunDialog from "./NewRunDialog";
import { Calculator, Users, Clock, FileText, CheckCircle2, AlertCircle, CalendarRange, Search } from "lucide-react"; 

export default async function PayrollHubPage(props: { searchParams: Promise<{ search?: string, status?: string }> }) {
  const params = await props.searchParams;
  const searchStr = params?.search?.toLowerCase() || '';
  const statusFilter = params?.status || 'ALL';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id, businesses(currency)").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // 1. DYNAMIC DATABASE QUERY (Status Filter)
  let query = supabase
    .from("payroll_runs")
    .select(`
      id, period_start, period_end, run_date, status, created_at,
      payslips ( id, gross_pay, net_pay )
    `)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (statusFilter !== 'ALL') {
    query = query.eq("status", statusFilter);
  }

  const { data: rawPayrollRuns } = await query;
  let payrollRuns = rawPayrollRuns || [];

  // 2. IN-MEMORY DATE SEARCH
  if (searchStr) {
    payrollRuns = payrollRuns.filter(run => {
      const startStr = new Date(run.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toLowerCase();
      const endStr = new Date(run.period_end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toLowerCase();
      const runStr = new Date(run.run_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toLowerCase();
      
      return startStr.includes(searchStr) || endStr.includes(searchStr) || runStr.includes(searchStr);
    });
  }

  // Fetch quick stats
  const { count: activeEmployees } = await supabase.from("employees").select("*", { count: 'exact', head: true }).eq("business_id", businessId).eq("is_active", true);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12">
      
      {/* HEADER & NAV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">Payroll Hub</h2>
          <p className="text-sm md:text-base text-neutral-500 mt-1">Generate payslips, track disbursements, and review draft cycles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/payroll/employees">
            <Button variant="outline" className="bg-white"><Users size={16} className="mr-2" /> Directory</Button>
          </Link>
          <NewRunDialog />
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-neutral-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Users size={20} /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Active Staff</p>
              <p className="text-2xl font-bold text-neutral-900">{activeEmployees || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ENHANCED SEARCH & FILTER BAR */}
      <form method="GET" className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-neutral-200 w-full md:max-w-2xl">
        <div className="flex items-center w-full sm:w-auto flex-1">
          <Search className="w-5 h-5 text-neutral-400 ml-2" />
          <Input 
            name="search" 
            placeholder="Search by month (e.g. Jan) or year..." 
            defaultValue={searchStr} 
            className="border-none shadow-none focus-visible:ring-0 text-base w-full" 
          />
        </div>
        <div className="flex w-full sm:w-auto gap-2 border-t sm:border-t-0 sm:border-l border-neutral-100 pt-2 sm:pt-0 sm:pl-2">
          <Select name="status" defaultValue={statusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] border-none shadow-none bg-neutral-50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Cycles</SelectItem>
              <SelectItem value="DRAFT">Pending Drafts</SelectItem>
              <SelectItem value="FINALIZED">Awaiting Payout</SelectItem>
              <SelectItem value="PAID">Disbursed</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="bg-neutral-900 text-white hover:bg-neutral-800 shrink-0">Filter</Button>
        </div>
      </form>

      {/* PAYROLL RUNS LEDGER */}
      <Card className="shadow-sm border-neutral-200 overflow-hidden">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4">
          <CardTitle className="text-lg flex items-center gap-2"><Calculator size={18} className="text-neutral-500" /> Payroll History</CardTitle>
          <CardDescription>Review drafts, finalized calculations, and posted payouts.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[900px]">
            <thead className="bg-white border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-neutral-600">Pay Period</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">Payout Date</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">Status</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Total Net Pay</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {(!payrollRuns || payrollRuns.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-neutral-50 text-neutral-400 rounded-full"><FileText size={32} /></div>
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

                  return (
                    <tr key={run.id} className="hover:bg-neutral-50 transition-colors group">
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-md bg-neutral-100 text-neutral-500">
                            <CalendarRange size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-neutral-900 text-sm">
                              {new Date(run.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(run.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-neutral-500 font-medium mt-0.5">{employeeCount} Payslips Generated</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 font-medium text-neutral-700">
                        {new Date(run.run_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      
                      <td className="px-6 py-4">
                        {run.status === 'DRAFT' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={12} /> Pending Review
                          </span>
                        )}
                        {run.status === 'FINALIZED' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                            <AlertCircle size={12} /> Awaiting Payout
                          </span>
                        )}
                        {run.status === 'PAID' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={12} /> Disbursed
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-neutral-900 text-base">{formatCurrency(totalNet)}</p>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link href={`/payroll/${run.id}`}>
                          <Button variant={run.status === 'DRAFT' ? "default" : "outline"} size="sm" className={run.status === 'DRAFT' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}>
                            {run.status === 'DRAFT' ? 'Review Draft' : 'View Details'}
                          </Button>
                        </Link>
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