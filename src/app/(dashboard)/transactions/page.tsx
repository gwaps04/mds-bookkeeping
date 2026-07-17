// src/app/(dashboard)/transactions/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import TablePagination from "@/components/TablePagination";
import { Search, Info, Download, BookOpen } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TransactionsPage(props: { searchParams: Promise<{ search?: string, type?: string, page?: string }> }) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;

  // URL STATE
  const searchStr = params?.search || '';
  const typeFilter = params?.type || 'all';
  
  // PAGINATION SETUP
  const ITEMS_PER_PAGE = 50;
  const currentPage = parseInt(params?.page || '1');
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  // ============================================================================
  // 1. THE FIX: INJECT `created_at` INTO THE SUPABASE QUERIES
  // ============================================================================
  let expQuery = supabase
    .from("expenses")
    .select(`id, date, created_at, description, amount, bank:accounts!expenses_account_id_fkey(name), category:accounts!expenses_category_id_fkey(name)`)
    .eq("business_id", businessId);

  let incQuery = supabase
    .from("income")
    .select(`id, date, created_at, description, amount, bank:accounts!income_account_id_fkey(name), category:accounts!income_category_id_fkey(name)`)
    .eq("business_id", businessId);

  // 2. APPLY DATABASE SEARCH FILTERS
  if (searchStr) {
    expQuery = expQuery.ilike("description", `%${searchStr}%`);
    incQuery = incQuery.ilike("description", `%${searchStr}%`);
  }

  let allTransactions: any[] = [];

  // 3. FETCH AND MERGE BASED ON TYPE FILTER
  if (typeFilter === 'all' || typeFilter === 'income') {
    const { data: income } = await incQuery;
    allTransactions.push(...(income || []).map(i => ({ ...i, type: "Income" })));
  }

  if (typeFilter === 'all' || typeFilter === 'expense') {
    const { data: expenses } = await expQuery;
    allTransactions.push(...(expenses || []).map(e => ({ ...e, type: "Expense" })));
  }

  // ============================================================================
  // 4. THE FIX: DETERMINISTIC MILLISECOND SORTING (LATEST TO OLDEST)
  // ============================================================================
  allTransactions.sort((a, b) => {
    // We use the absolute system timestamp (created_at) to guarantee order.
    // If a manual entry somehow lacks created_at, it gracefully falls back to the calendar date.
    const timeA = new Date(a.created_at || a.date).getTime();
    const timeB = new Date(b.created_at || b.date).getTime();
    
    return timeB - timeA; // Positive result pushes 'b' before 'a' (Descending)
  });

  // 5. IN-MEMORY SERVER SLICE FOR PAGINATION
  const totalItems = allTransactions.length;
  const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full max-w-full overflow-x-hidden">
      
      {/* HEADER & EXPORT BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="w-full lg:flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Unified Ledger</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">A complete chronological history of all money moving in and out.</p>
        </div>
        
        <a href="/api/export" download className="w-full md:w-auto shrink-0 mt-2 md:mt-0">
          <Button className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold flex items-center justify-center gap-2 transition-all">
            <Download size={16} /> Export to CSV
          </Button>
        </a>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-md shrink-0 mt-0.5 shadow-sm">
            <Info size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-1.5">Quick Guide: The Master Timeline</h3>
            <p className="text-xs sm:text-sm text-blue-800 leading-relaxed">
              This is your immutable master ledger. It automatically combines all manual expenses, retail sales, and paid invoices into a single timeline. Use the search bar to locate specific transactions across both income and expense categories instantly.
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <Card className="shadow-sm border-neutral-200 bg-white w-full">
        <CardContent className="p-4 md:p-5">
          <form method="GET" className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-end w-full">
            
            <input type="hidden" name="page" value="1" />

            <div className="flex-1 w-full min-w-[200px] space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Search Description</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <Input name="search" placeholder="e.g. Office Supplies..." defaultValue={searchStr} className="pl-9 bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900" />
              </div>
            </div>

            <div className="w-full sm:w-auto min-w-[160px] space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Transaction Type</Label>
              <Select name="type" defaultValue={typeFilter}>
                <SelectTrigger className="bg-neutral-50 border-neutral-200"><SelectValue placeholder="All Transactions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="income">Income Only</SelectItem>
                  <SelectItem value="expense">Expenses Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button type="submit" className="bg-neutral-900 text-white flex-1 sm:flex-none shadow-sm transition-all hover:bg-neutral-800">Filter</Button>
              {(searchStr || typeFilter !== 'all') && (
                <Link href="/transactions" className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button>
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* UNIFIED TRANSACTIONS TABLE */}
      <Card className="shadow-sm border-neutral-200 flex flex-col w-full overflow-hidden bg-white">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 shrink-0">
          <CardTitle className="text-lg flex items-center gap-2"><BookOpen size={18} className="text-neutral-500"/> Transaction History</CardTitle>
          <CardDescription>All records sorted mathematically by exact timestamp.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 w-full overflow-x-auto">
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-white border-b border-neutral-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap w-auto">Date</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] w-full">Description</th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Category</th>
                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Paid From / To</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap w-auto">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-neutral-500">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-50/60 transition-colors group">
                    
                    <td className="px-4 sm:px-6 py-4 text-neutral-500 font-medium whitespace-nowrap text-xs sm:text-sm align-top sm:align-middle">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    
                    <td className="px-4 sm:px-6 py-4 whitespace-normal break-words w-full min-w-[150px] align-top sm:align-middle">
                      <p className="font-bold text-neutral-900 text-sm leading-tight">
                        {t.description || <span className="text-neutral-400 italic">No description</span>}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 md:hidden">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
                          t.type === 'Income' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {(t.category as any)?.name || 'Uncategorized'}
                        </span>
                        <span className="sm:hidden text-[10px] text-neutral-500 font-medium ml-1">
                          • {(t.bank as any)?.name || 'Unknown Account'}
                        </span>
                      </div>
                    </td>

                    <td className="hidden md:table-cell px-4 sm:px-6 py-4 align-middle whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                        t.type === 'Income' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {(t.category as any)?.name || 'Uncategorized'}
                      </span>
                    </td>
                    
                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-neutral-600 text-xs sm:text-sm font-medium align-middle whitespace-nowrap">
                      {(t.bank as any)?.name || <span className="text-neutral-400 italic">Unknown Account</span>}
                    </td>

                    <td className={`px-4 sm:px-6 py-4 font-black text-right text-sm sm:text-base whitespace-nowrap align-top sm:align-middle ${t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'Income' ? '+' : '-'}₱{Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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