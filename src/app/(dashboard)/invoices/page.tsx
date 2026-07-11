// src/app/(dashboard)/invoices/page.tsx
import { createClient } from "@/lib/supabase/server";
import { deleteOfficialInvoice } from "@/features/invoices/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ConfirmDeleteForm from "@/components/ConfirmDeleteForm";
import { Lock, Plus, FileText } from "lucide-react"; 

import { getTenantAccessLevel } from "@/lib/subscription";
import { redirect } from "next/navigation";

import TablePagination from "@/components/TablePagination"; 

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InvoicesPage(props: { searchParams: Promise<{ search?: string, status?: string, page?: string }> }) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user?.id).single();
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';

  // PAGINATION SETUP
  const ITEMS_PER_PAGE = 50;
  const currentPage = parseInt(params?.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // ============================================================================
  // 1. THE SAAS SUBSCRIPTION ENGINE
  // ============================================================================
  const { data: business } = await supabase
    .from("businesses")
    .select("subscription_status, subscription_tier, trial_ends_at")
    .eq("id", profile?.business_id)
    .single();

  const accessState = getTenantAccessLevel(business);
  const isLocked = accessState.isLocked; 

  // 2. GET TODAY'S DATE FOR THE DETECTOR
  const today = new Date().toISOString().split('T')[0];

  // ============================================================================
  // 3. BUILD SEARCH & FILTER QUERY WITH PAGINATION & ORPHAN GUARD
  // ============================================================================
  let query = supabase
    .from("invoices")
    .select("*, income(id)", { count: 'exact' }) 
    .eq("business_id", profile?.business_id)
    .order("created_at", { ascending: false });

  if (params?.search) query = query.ilike("client_name", `%${params.search}%`);
  
  // 4. THE SMART STATUS FILTER
  if (params?.status && params?.status !== "all") {
    if (params.status === "overdue") {
      query = query.neq("status", "paid").neq("status", "cancelled").lt("due_date", today);
    } else {
      query = query.eq("status", params.status);
    }
  }

  // Apply Pagination Database Limits
  query = query.range(from, to);

  const { data: fetchedInvoices, count } = await query;
  const totalItems = count || 0;

  // 5. THE OVERDUE & ORPHAN DETECTOR (ON-THE-FLY INTERCEPTOR)
  const invoices = (fetchedInvoices || []).map(inv => {
    const isOverdue = (inv.status !== 'paid' && inv.status !== 'cancelled') && (inv.due_date < today);
    const hasPayments = inv.income && inv.income.length > 0; 
    
    return {
      ...inv,
      displayStatus: isOverdue ? 'overdue' : inv.status,
      hasPayments
    };
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full max-w-full overflow-x-hidden">
      
      {/* HEADER & NEW BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="w-full lg:flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Invoices</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Manage and track your accounts receivable.</p>
        </div>
        
        {isLocked ? (
          <Button disabled className="w-full md:w-auto bg-neutral-200 text-neutral-500 cursor-not-allowed shadow-none font-medium flex items-center justify-center gap-2 h-11 md:h-10 shrink-0">
            <Lock size={16} /> Creation Locked
          </Button>
        ) : (
          <Link href="/invoices/new" className="w-full md:w-auto shrink-0">
            <Button className="w-full md:w-auto bg-blue-700 hover:bg-blue-800 text-white shadow-sm font-bold flex items-center justify-center gap-2 transition-all h-11 md:h-10">
              <Plus size={16} /> Create Invoice
            </Button>
          </Link>
        )}
      </div>

      {/* SEARCH & FILTER BAR */}
      <Card className="shadow-sm border-neutral-200 bg-white w-full">
        <CardContent className="p-4 md:p-5">
          <form method="GET" className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-end w-full">
            
            <input type="hidden" name="page" value="1" />

            <div className="flex-1 w-full min-w-[200px] space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Search Client</Label>
              <Input name="search" placeholder="Search client name..." defaultValue={params?.search} className="bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900" />
            </div>
            
            <div className="w-full sm:w-auto min-w-[180px] space-y-1.5">
              <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Filter Status</Label>
              <Select name="status" defaultValue={params?.status || "all"}>
                <SelectTrigger className="bg-neutral-50 border-neutral-200"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button type="submit" className="bg-neutral-900 text-white flex-1 sm:flex-none shadow-sm transition-all hover:bg-neutral-800">Filter</Button>
              {(params?.search || params?.status) && (
                <Link href="/invoices" className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button>
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* INVOICE LEDGER - FLUID OPTIMIZED */}
      <Card className="shadow-sm border-neutral-200 flex flex-col w-full overflow-hidden bg-white">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 shrink-0">
          <CardTitle className="text-lg flex items-center gap-2"><FileText size={18} className="text-neutral-500"/> Invoice Ledger</CardTitle>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 w-full overflow-x-auto">
          {/* THE FIX: Replaced min-w-[800px] with table-auto. Added strategic hiding of columns. */}
          <table className="w-full text-left text-sm table-auto">
            <thead className="bg-white border-b border-neutral-200">
              <tr>
                <th className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Invoice ID</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] w-full">Client Details</th>
                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Due Date</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap">Amount</th>
                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-center whitespace-nowrap">Status</th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {(!invoices || invoices.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-neutral-500">
                    No invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  
                  // Centralized Status Badge rendering for use in Desktop and Mobile stacks
                  const statusBadge = (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border shadow-sm
                      ${inv.displayStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        inv.displayStatus === 'partially_paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        inv.displayStatus === 'overdue' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 
                        'bg-neutral-50 text-neutral-700 border-neutral-200'}`}>
                      {inv.displayStatus.replace('_', ' ')}
                    </span>
                  );

                  return (
                    <tr key={inv.id} className={`hover:bg-neutral-50/60 transition-colors group ${inv.displayStatus === 'overdue' ? 'bg-red-50/20' : ''}`}>
                      
                      {/* 1. INVOICE ID: Hidden on small screens (stacked inside Client) */}
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4 font-mono text-[11px] text-neutral-500 align-middle whitespace-nowrap">
                        {inv.id.split('-')[0].toUpperCase()}
                      </td>
                      
                      {/* 2. CLIENT DETAILS & PROGRESSIVE STACKING */}
                      <td className="px-4 sm:px-6 py-4 whitespace-normal break-words w-full min-w-[150px] align-middle">
                        <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight">{inv.client_name}</p>
                        
                        {/* THE MAGIC: Mobile-only visible details (ID hidden on md, Due Date hidden on sm) */}
                        <div className="flex flex-col gap-1 mt-1.5 md:hidden">
                          <span className="font-mono text-[10px] text-neutral-500 font-medium">ID: {inv.id.split('-')[0].toUpperCase()}</span>
                          <span className={`sm:hidden text-[10px] font-medium ${inv.displayStatus === 'overdue' ? 'text-red-600 font-bold' : 'text-neutral-500'}`}>
                            Due: {new Date(inv.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      
                      {/* 3. DUE DATE: Hidden on mobile (stacked inside Client) */}
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4 align-middle whitespace-nowrap">
                        <span className={`text-xs sm:text-sm font-medium ${inv.displayStatus === 'overdue' ? 'text-red-600 font-bold' : 'text-neutral-600'}`}>
                          {new Date(inv.due_date).toLocaleDateString()}
                        </span>
                      </td>

                      {/* 4. AMOUNT: Always visible, strictly right-aligned */}
                      <td className="px-4 sm:px-6 py-4 text-right align-middle whitespace-nowrap">
                        <div className="font-black text-neutral-900 text-sm sm:text-base">
                          ₱{Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        {/* Status Badge specifically for mobile (hidden on sm+) */}
                        <div className="mt-2 sm:hidden flex justify-end">
                          {statusBadge}
                        </div>
                      </td>

                      {/* 5. STATUS: Hidden on mobile (stacked inside Amount) */}
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-center align-middle whitespace-nowrap">
                        {statusBadge}
                      </td>
                      
                      {/* 6. ACTIONS: Always visible, stacks vertically on mobile to preserve touch targets */}
                      <td className="px-4 sm:px-6 py-4 text-center align-middle whitespace-nowrap">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                          
                          <Link href={`/invoices/${inv.id}`} className="w-full sm:w-auto">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto h-8 sm:h-9 px-3 text-xs bg-white text-neutral-700 hover:bg-neutral-100 transition-colors shadow-sm font-bold">
                              View PDF
                            </Button>
                          </Link>

                          {isLocked ? (
                            <Button disabled variant="outline" size="sm" className="w-full sm:w-auto h-8 sm:h-9 px-3 text-xs bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed font-bold">
                              <Lock size={10} className="mr-1.5" /> Edit
                            </Button>
                          ) : (
                            <Link href={`/invoices/${inv.id}/edit`} className="w-full sm:w-auto">
                              <Button variant="outline" size="sm" className="w-full sm:w-auto h-8 sm:h-9 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors shadow-sm font-bold">
                                Edit
                              </Button>
                            </Link>
                          )}
                          
                          {isOwner && !isLocked && (
                            inv.hasPayments ? (
                              <Button disabled variant="outline" size="sm" className="w-full sm:w-auto h-8 sm:h-9 px-3 text-xs bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed font-bold" title="Payments recorded. Void payments before deleting invoice.">
                                <Lock size={10} className="mr-1.5" /> Locked
                              </Button>
                            ) : (
                              <div className="w-full sm:w-auto">
                                <ConfirmDeleteForm 
                                  action={deleteOfficialInvoice} 
                                  id={inv.id} 
                                  itemName={`Invoice #${inv.id.split('-')[0].toUpperCase()}`} 
                                />
                              </div>
                            )
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })
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