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

  // 1. BUILD BASE QUERIES
  let expQuery = supabase
    .from("expenses")
    .select(`id, date, description, amount, bank:accounts!expenses_account_id_fkey(name), category:accounts!expenses_category_id_fkey(name)`)
    .eq("business_id", businessId);

  let incQuery = supabase
    .from("income")
    .select(`id, date, description, amount, bank:accounts!income_account_id_fkey(name), category:accounts!income_category_id_fkey(name)`)
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

  // 4. SORT CHRONOLOGICALLY
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 5. IN-MEMORY SERVER SLICE FOR PAGINATION
  const totalItems = allTransactions.length;
  const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* HEADER & EXPORT BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">Unified Ledger</h2>
          <p className="text-sm md:text-base text-neutral-500 mt-1">A complete chronological history of all money moving in and out.</p>
        </div>
        
        <a href="/api/export" download>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium flex items-center gap-2 transition-all">
            <Download size={16} /> Export to CSV
          </Button>
        </a>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-md shrink-0 mt-0.5">
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
      <Card className="shadow-sm border-neutral-200 bg-white">
        <CardContent className="p-4">
          <form method="GET" className="flex flex-col md:flex-row gap-3 md:items-end">
            
            {/* Reset Page to 1 when a new search/filter is executed! */}
            <input type="hidden" name="page" value="1" />

            <div className="flex-1 w-full space-y-1">
              <Label className="text-xs text-neutral-500">Search Description</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                <Input name="search" placeholder="e.g. Office Supplies, Check #123..." defaultValue={searchStr} className="pl-9" />
              </div>
            </div>

            <div className="w-full md:w-48 space-y-1">
              <Label className="text-xs text-neutral-500">Transaction Type</Label>
              <Select name="type" defaultValue={typeFilter}>
                <SelectTrigger><SelectValue placeholder="All Transactions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="income">Income Only</SelectItem>
                  <SelectItem value="expense">Expenses Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
              <Button type="submit" className="bg-neutral-900 text-white flex-1 md:flex-none">Filter</Button>
              {(searchStr || typeFilter !== 'all') && (
                <Link href="/transactions" className="flex-1 md:flex-none">
                  <Button variant="outline" className="text-neutral-500 w-full">Clear</Button>
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* UNIFIED TRANSACTIONS TABLE */}
      <Card className="shadow-sm border-neutral-200 flex flex-col">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 shrink-0">
          <CardTitle className="text-lg flex items-center gap-2"><BookOpen size={18} className="text-neutral-500"/> Transaction History</CardTitle>
          <CardDescription>All records sorted by date.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
              <thead className="bg-white border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Date</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Description</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Category</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Paid From / To</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Amount</th>
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
                    <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-700">
                        {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-900">
                        {t.description || <span className="text-neutral-400 italic">No description</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          t.type === 'Income' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {(t.category as any)?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        {(t.bank as any)?.name || <span className="text-neutral-400 italic">Unknown Account</span>}
                      </td>
                      <td className={`px-6 py-4 font-black text-right text-base ${t.type === 'Income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === 'Income' ? '+' : '-'}₱{Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>

        {/* UNIVERSAL PAGINATION COMPONENT */}
        <TablePagination 
          totalItems={totalItems} 
          itemsPerPage={ITEMS_PER_PAGE} 
          currentPage={currentPage} 
        />
      </Card>

    </div>
  );
}