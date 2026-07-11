// src/app/(dashboard)/accounts/page.tsx
import { createClient } from "@/lib/supabase/server";
import { restoreAccount } from "@/features/accounts/actions"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import CreateAccountForm from "./CreateAccountForm"; 
import ArchiveAccountDialog from "./ArchiveAccountDialog"; 
import SubmitButton from "@/components/SubmitButton"; 
import { ArchiveRestore, Lock, Info } from "lucide-react"; 

import TablePagination from "@/components/TablePagination"; 
import { getTenantAccessLevel } from "@/lib/subscription";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AccountsPage(props: { searchParams: Promise<{ search?: string, type?: string, view?: string, page?: string }> }) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role, businesses(allow_staff_account_creation)")
    .eq("id", user?.id)
    .single();
    
  const businessId = profile?.business_id;
  const role = profile?.role;
  const isOwner = role === 'business_owner' || role === 'super_admin';

  const businessData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const allowAccountCreation = businessData?.allow_staff_account_creation ?? true;
  const canCreateAccount = isOwner || (role === 'staff' && allowAccountCreation);

  const isArchiveView = params?.view === 'archived';

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
    .eq("id", businessId)
    .single();

  const accessState = getTenantAccessLevel(business);
  const isLocked = accessState.isLocked; 
  // ============================================================================

  // ============================================================================
  // THE GATEKEEPER: Dynamic Archive / Active Querying with Database Limits
  // ============================================================================
  let query = supabase
    .from("accounts")
    .select("*", { count: 'exact' })
    .eq("business_id", businessId)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (isArchiveView) {
    query = query.eq("is_archived", true);
  } else {
    query = query.neq("is_archived", true); 
  }

  if (params?.search) query = query.ilike("name", `%${params.search}%`);
  if (params?.type && params.type !== "all") query = query.eq("type", params.type);

  // Apply Pagination Database Limits
  query = query.range(from, to);

  const { data: accounts, count } = await query;
  const totalItems = count || 0;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full max-w-full overflow-x-hidden">
      
      {/* THE FIX: Fluid Header sizing */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="w-full">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Chart of Accounts</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Manage your banks, cash accounts, and ledger categories.</p>
        </div>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-md shrink-0 mt-0.5 shadow-sm">
            <Info size={16} />
          </div>
          <div className="w-full">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2.5">Quick Guide: Understanding Financial Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs sm:text-sm text-blue-800 leading-relaxed">
              <p><strong className="font-bold text-blue-950">Asset:</strong> Bank accounts, cash registers, and e-wallets (Where actual money sits).</p>
              <p><strong className="font-bold text-blue-950">Revenue:</strong> Categories for tracking sales, service income, and business earnings.</p>
              <p><strong className="font-bold text-blue-950">Expense:</strong> Categories for tracking bills, payroll, and outgoing operational costs.</p>
              <p><strong className="font-bold text-blue-950">Liability:</strong> Credit cards, loans, or money the business owes to third parties.</p>
              <p className="md:col-span-2 pt-1.5 mt-1.5 border-t border-blue-200/60">
                <strong className="font-bold text-blue-950">Equity:</strong> Owner&apos;s capital injections or drawings. <em>(Logging an account here ensures your capital injections add to your Net Cash Balance without inflating your taxable Revenue!)</em>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-start">
        
        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-1">
          {isLocked ? (
            <Card className="shadow-sm border-neutral-200 lg:sticky lg:top-8 bg-neutral-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-neutral-700">
                  <Lock size={18} /> Creation Locked
                </CardTitle>
                <CardDescription>Your ledger is in Read-Only mode.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-neutral-100 border border-neutral-200 rounded-md text-sm text-neutral-600 leading-relaxed text-center">
                  Please resolve your billing status to add new banks or financial categories to your ledger.
                </div>
              </CardContent>
            </Card>
          ) : canCreateAccount ? (
            <Card className="shadow-sm border-neutral-200 lg:sticky lg:top-8">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-neutral-900">Add New Account</CardTitle>
                <CardDescription>Expand your financial ledger structure.</CardDescription>
              </CardHeader>
              <CardContent>
                <CreateAccountForm />
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border-neutral-200 lg:sticky lg:top-8">
              <CardHeader>
                <CardTitle className="text-lg">Structural Controls</CardTitle>
                <CardDescription>Account creation is restricted.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-800 leading-relaxed">
                  <span className="font-bold block mb-1">Access Restricted:</span>
                  Only Business Owners have permission to modify the structural Chart of Accounts. Please contact your administrator to add new banks or categories.
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: TABLE & FILTERS */}
        <div className="lg:col-span-2 space-y-4 w-full">
          
          <Card className="shadow-sm border-neutral-200 bg-white w-full">
            <CardContent className="p-4 md:p-5">
              {/* THE FIX: Flex-wrap allows filters to stack organically on mobile but form a clean row on desktop */}
              <form method="GET" className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-end w-full">
                
                <input type="hidden" name="page" value="1" />

                <div className="flex-1 w-full min-w-[200px] space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Search Accounts</Label>
                  <Input name="search" placeholder="Search by name..." defaultValue={params?.search} className="bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900" />
                </div>
                
                <div className="w-full sm:w-auto min-w-[140px] space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Status</Label>
                  <Select name="view" defaultValue={params?.view || "active"}>
                    <SelectTrigger className="bg-neutral-50 border-neutral-200"><SelectValue placeholder="Active" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-auto min-w-[160px] space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Filter by Type</Label>
                  <Select name="type" defaultValue={params?.type || "all"}>
                    <SelectTrigger className="bg-neutral-50 border-neutral-200"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="asset">Assets (Banks/Cash)</SelectItem>
                      <SelectItem value="revenue">Revenue Categories</SelectItem>
                      <SelectItem value="expense">Expense Categories</SelectItem>
                      <SelectItem value="liability">Liabilities (Loans)</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <Button type="submit" className="bg-neutral-900 text-white flex-1 sm:flex-none shadow-sm transition-all hover:bg-neutral-800">Filter</Button>
                  {(params?.search || params?.type || params?.view) && (
                    <Link href="/accounts" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button>
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {isArchiveView && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center gap-2 text-amber-800 text-sm shadow-sm">
              <ArchiveRestore size={16} />
              <p>You are viewing <strong>Archived Accounts</strong>. These are hidden from daily ledgers but retain their transaction history.</p>
            </div>
          )}

          {/* THE FIX: Replaced `min-w-[500px]` with table-auto and configured intelligent column wrapping */}
          <Card className="shadow-sm border-neutral-200 flex flex-col bg-white overflow-hidden w-full">
            <CardContent className="p-0 flex-1 w-full overflow-x-auto">
              <table className="w-full text-left text-sm table-auto">
                <thead className="bg-neutral-50/80 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] w-full">Account Name</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] whitespace-nowrap">Type & Category</th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(!accounts || accounts.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-16 text-center text-neutral-500">
                        {isArchiveView ? "No archived accounts found." : "No active accounts found."}
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc) => (
                      <tr key={acc.id} className={`hover:bg-neutral-50/60 transition-colors ${isArchiveView ? 'opacity-75 grayscale' : ''}`}>
                        
                        {/* Account Name: Allowed to break words and wrap freely on small screens */}
                        <td className="px-4 sm:px-6 py-4 whitespace-normal break-words w-full min-w-[140px]">
                          <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight">{acc.name}</p>
                          {acc.account_number && <p className="text-[11px] sm:text-xs text-neutral-400 font-mono mt-1">Acc No: {acc.account_number}</p>}
                        </td>
                        
                        {/* Type & Category: Badges wrap organically if squeezed */}
                        <td className="px-4 sm:px-6 py-4 whitespace-normal sm:whitespace-nowrap align-middle">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                            <span className="inline-block w-fit px-2.5 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200 shadow-sm">
                              {acc.type}
                            </span>
                            <span className="text-neutral-500 text-[10px] sm:text-xs font-medium">{acc.category}</span>
                          </div>
                        </td>
                        
                        {/* Actions: Stacks vertically on mobile to ensure buttons remain clickable (44px touch rule) */}
                        <td className="px-4 sm:px-6 py-4 text-center align-middle">
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            
                            {isLocked ? (
                              <Button disabled variant="outline" size="sm" className="h-8 px-3 text-xs bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed w-full sm:w-auto">
                                <Lock size={10} className="mr-1.5" /> Locked
                              </Button>
                            ) : canCreateAccount ? (
                              isArchiveView ? (
                                <form action={async (formData) => {
                                  "use server";
                                  try { await restoreAccount(formData); } catch (e) { console.error(e); }
                                }} className="w-full sm:w-auto">
                                  <input type="hidden" name="id" value={acc.id} />
                                  <SubmitButton 
                                    title="Restore" 
                                    loadingTitle="Restoring..." 
                                    className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm w-full sm:w-auto font-bold" 
                                  />
                                </form>
                              ) : (
                                <>
                                  <Link href={`/accounts/${acc.id}/edit`} className="w-full sm:w-auto">
                                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors w-full sm:w-auto font-bold shadow-sm">Edit</Button>
                                  </Link>
                                  <div className="w-full sm:w-auto">
                                    <ArchiveAccountDialog accountId={acc.id} accountName={acc.name} />
                                  </div>
                                </>
                              )
                            ) : null}

                          </div>
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
      </div>
    </div>
  );
}