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
import { ArchiveRestore, Lock } from "lucide-react"; // THE FIX: Imported Lock icon

// THE FIX: Import the SaaS Engine
import { getTenantAccessLevel } from "@/lib/subscription";

export default async function AccountsPage(props: { searchParams: Promise<{ search?: string, type?: string, view?: string }> }) {
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

  // ============================================================================
  // 1. THE SAAS SUBSCRIPTION ENGINE
  // ============================================================================
  const { data: business } = await supabase
    .from("businesses")
    .select("subscription_status, subscription_tier, trial_ends_at")
    .eq("id", businessId)
    .single();

  const accessState = getTenantAccessLevel(business);
  const isLocked = accessState.isLocked; // <-- The Master UI Gate
  // ============================================================================

  // ============================================================================
  // THE GATEKEEPER: Dynamic Archive / Active Querying
  // ============================================================================
  let query = supabase
    .from("accounts")
    .select("*")
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

  const { data: accounts } = await query;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900">Chart of Accounts</h2>
          <p className="text-sm md:text-base text-neutral-500 mt-1">Manage your banks, cash accounts, and ledger categories.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3">
        
        <div className="lg:col-span-1">
          {/* THE FIX: THE UI MUTATION GATE APPLIED TO THE CREATION CARD */}
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
                <CardTitle className="text-lg">Add New Account</CardTitle>
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

        <div className="lg:col-span-2 space-y-4">
          
          <Card className="shadow-sm border-neutral-200 bg-white">
            <CardContent className="p-4">
              <form method="GET" className="flex flex-col md:flex-row gap-3 md:items-end">
                <div className="flex-1 w-full space-y-1">
                  <Label className="text-xs text-neutral-500">Search Accounts</Label>
                  <Input name="search" placeholder="Search by name..." defaultValue={params?.search} />
                </div>
                
                <div className="w-full md:w-32 space-y-1">
                  <Label className="text-xs text-neutral-500">Status</Label>
                  <Select name="view" defaultValue={params?.view || "active"}>
                    <SelectTrigger><SelectValue placeholder="Active" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-40 space-y-1">
                  <Label className="text-xs text-neutral-500">Filter by Type</Label>
                  <Select name="type" defaultValue={params?.type || "all"}>
                    <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
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
                
                <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <Button type="submit" className="bg-neutral-900 text-white flex-1 md:flex-none">Filter</Button>
                  {(params?.search || params?.type || params?.view) && (
                    <Link href="/accounts" className="flex-1 md:flex-none">
                      <Button variant="outline" className="text-neutral-500 w-full">Clear</Button>
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {isArchiveView && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center gap-2 text-amber-800 text-sm">
              <ArchiveRestore size={16} />
              <p>You are viewing <strong>Archived Accounts</strong>. These are hidden from daily ledgers but retain their transaction history.</p>
            </div>
          )}

          <Card className="shadow-sm border-neutral-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[500px]">
                  <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                    <tr>
                      <th className="px-4 py-3 font-medium text-neutral-900">Account Name</th>
                      <th className="px-4 py-3 font-medium text-neutral-900">Type & Category</th>
                      <th className="px-4 py-3 font-medium text-neutral-900 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {(!accounts || accounts.length === 0) ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">
                          {isArchiveView ? "No archived accounts found." : "No active accounts found."}
                        </td>
                      </tr>
                    ) : (
                      accounts.map((acc) => (
                        <tr key={acc.id} className={`hover:bg-neutral-50 transition-colors ${isArchiveView ? 'opacity-75 grayscale' : ''}`}>
                          <td className="px-4 py-4">
                            <p className="font-bold text-neutral-900">{acc.name}</p>
                            {acc.account_number && <p className="text-xs text-neutral-500 font-mono mt-0.5">Acc No: {acc.account_number}</p>}
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 uppercase tracking-wider border border-neutral-200 mr-2">
                              {acc.type}
                            </span>
                            <span className="text-neutral-500 text-xs">{acc.category}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              
                              {/* THE FIX: THE UI MUTATION GATE APPLIED TO ROW ACTIONS */}
                              {isLocked ? (
                                <Button disabled variant="outline" size="sm" className="h-8 px-3 text-xs bg-neutral-50 text-neutral-400 border-neutral-200 cursor-not-allowed">
                                  <Lock size={10} className="mr-1.5" /> Locked
                                </Button>
                              ) : canCreateAccount ? (
                                isArchiveView ? (
                                  /* THE RESTORE BUTTON UI */
                                  <form action={async (formData) => {
                                    "use server";
                                    try { await restoreAccount(formData); } catch (e) { console.error(e); }
                                  }}>
                                    <input type="hidden" name="id" value={acc.id} />
                                    <SubmitButton 
                                      title="Restore Account" 
                                      loadingTitle="Restoring..." 
                                      className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" 
                                    />
                                  </form>
                                ) : (
                                  /* THE NORMAL EDIT & SMART ARCHIVE UI */
                                  <>
                                    <Link href={`/accounts/${acc.id}/edit`}>
                                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50">Edit</Button>
                                    </Link>
                                    
                                    <ArchiveAccountDialog accountId={acc.id} accountName={acc.name} />
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
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}