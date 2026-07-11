// src/app/(dashboard)/admin/businesses/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import ManageLimitButton from "./ManageLimitButton"; 
import ManageOrgLimitButton from "./ManageOrgLimitButton"; 
import ManageFeaturesButton from "./ManageFeaturesButton";
import ManageInventoryButton from "./ManageInventoryButton"; 
import ManagePayrollButton from "./ManagePayrollButton"; 
import ManagePlannerButton from "./ManagePlannerButton"; 
import ManageReportsButton from "./ManageReportsButton"; 
import ApproveTenantDialog from "./ApproveTenantDialog";
import ManageBillingDialog from "./ManageBillingDialog";
import OwnerProfileDialog from "./OwnerProfileDialog"; 
import Link from "next/link";
import React from "react";
import { ChevronDown, Mail } from "lucide-react"; 

// THE FIX 1: Import Universal Pagination Component
import TablePagination from "@/components/TablePagination";

// ============================================================================
// HELPER FUNCTIONS FOR CLEAN JSX
// ============================================================================
function renderPlanAndBilling(biz: any) {
  if (biz.status === 'pending') {
    return <span className="text-xs text-neutral-400 italic">Awaiting Provisioning</span>;
  }

  const subStatus = biz.subscription_status || 'trial';
  const isTrial = subStatus === 'trial';
  const isActive = subStatus === 'active';
  const isSuspended = subStatus === 'suspended';
  const isCanceled = subStatus === 'canceled';
  const isPastDue = subStatus === 'past_due';

  let badgeColor = "bg-neutral-100 text-neutral-700 border-neutral-200";
  if (isTrial) badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
  if (isActive) badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (isPastDue) badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
  if (isSuspended || isCanceled) badgeColor = "bg-red-50 text-red-700 border-red-200";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex gap-2 items-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-white shadow-sm">
          {biz.subscription_tier || 'ESSENTIAL'}
        </span>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
          {subStatus}
        </span>
      </div>
      {isTrial && biz.trial_ends_at && (
        <span className="text-[11px] font-medium text-blue-600 mt-1">Expires: {new Date(biz.trial_ends_at).toLocaleDateString()}</span>
      )}
      {isActive && <span className="text-[11px] font-medium text-emerald-600 mt-1">Good Standing</span>}
      {(isSuspended || isCanceled || isPastDue) && <span className="text-[11px] font-medium text-red-600 mt-1 animate-pulse">Account Locked</span>}
    </div>
  );
}

function renderSystemStatus(biz: any) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
      biz.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 border' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${biz.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
      {biz.status ? biz.status : 'UNKNOWN'}
    </span>
  );
}

export default async function SuperAdminBusinessesPage(props: { 
  // THE FIX 2: Added "page" to the Search Params
  searchParams: Promise<{ search?: string, tier?: string, billing?: string, status?: string, page?: string }> 
}) {
  const params = await props.searchParams;
  const searchStr = params?.search?.toLowerCase() || '';
  const tierFilter = params?.tier || 'all';
  const billingFilter = params?.billing || 'all';
  const statusFilter = params?.status || 'all';

  // PAGINATION SETUP
  const ITEMS_PER_PAGE = 50;
  const currentPage = parseInt(params?.page || '1');
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
  if (profile?.role !== 'super_admin') redirect("/dashboard");

  const { data: businesses } = await supabase
    .from("businesses")
    .select(`
      id,
      owner_id, 
      business_name,
      address,
      status,
      subscription_status,
      subscription_tier,
      trial_ends_at,
      created_at,
      max_staff_limit,
      allow_receipt_uploads,
      has_inventory_access,
      has_payroll_access,
      has_planner_access,
      has_reports_access
    `)
    .order("created_at", { ascending: true }); 

  const ownerIds = Array.from(new Set((businesses || []).map(b => b.owner_id).filter(Boolean)));
  
  const { data: profiles } = await supabase
    .from("profiles")
    .select(`id, full_name, email, mobile_number, role, max_businesses_limit, created_at`)
    .in('id', ownerIds);

  const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

  const portfoliosMap = new Map<string, { ownerDetails: any; mainAccountId: string; businesses: any[] }>();

  (businesses || []).forEach((biz) => {
    const ownerId = biz.owner_id;
    const owner = profilesMap.get(ownerId) || { id: ownerId, full_name: 'Unknown Owner', email: 'No email' };
    
    if (!portfoliosMap.has(ownerId)) {
      portfoliosMap.set(ownerId, { ownerDetails: owner, mainAccountId: biz.id, businesses: [] });
    }
    portfoliosMap.get(ownerId)?.businesses.push(biz);
  });

  let processedPortfolios = Array.from(portfoliosMap.values()).map(portfolio => {
    const mainAccount = portfolio.businesses.find(b => b.id === portfolio.mainAccountId);
    let subAccounts = portfolio.businesses.filter(b => b.id !== portfolio.mainAccountId);
    subAccounts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (tierFilter !== 'all') subAccounts = subAccounts.filter(b => (b.subscription_tier || 'essential').toLowerCase() === tierFilter.toLowerCase());
    if (billingFilter !== 'all') subAccounts = subAccounts.filter(b => (b.subscription_status || 'trial').toLowerCase() === billingFilter.toLowerCase());
    if (statusFilter !== 'all') subAccounts = subAccounts.filter(b => (b.status || 'pending').toLowerCase() === statusFilter.toLowerCase());

    let mainMatchesExact = true;
    if (tierFilter !== 'all' && (mainAccount?.subscription_tier || 'essential').toLowerCase() !== tierFilter.toLowerCase()) mainMatchesExact = false;
    if (billingFilter !== 'all' && (mainAccount?.subscription_status || 'trial').toLowerCase() !== billingFilter.toLowerCase()) mainMatchesExact = false;
    if (statusFilter !== 'all' && (mainAccount?.status || 'pending').toLowerCase() !== statusFilter.toLowerCase()) mainMatchesExact = false;

    let mainMatchesSearch = false;
    if (searchStr && mainAccount) {
      const ownerName = (portfolio.ownerDetails?.full_name || '').toLowerCase();
      const ownerEmail = (portfolio.ownerDetails?.email || '').toLowerCase();
      const ownerPhone = (portfolio.ownerDetails?.mobile_number || '').toLowerCase();
      const mainName = mainAccount.business_name.toLowerCase();
      
      if (ownerName.includes(searchStr) || ownerEmail.includes(searchStr) || ownerPhone.includes(searchStr) || mainName.includes(searchStr)) {
        mainMatchesSearch = true;
      }
      subAccounts = subAccounts.filter(b => b.business_name.toLowerCase().includes(searchStr));
    } else {
      mainMatchesSearch = true; 
    }

    return { ownerDetails: portfolio.ownerDetails, mainAccount: mainAccount, subAccounts: subAccounts, hasMatches: (mainMatchesExact && mainMatchesSearch) || subAccounts.length > 0 };
  }).filter(p => p.hasMatches && p.mainAccount); 

  processedPortfolios.sort((a, b) => {
    const datesA = [new Date(a.mainAccount.created_at).getTime(), ...a.subAccounts.map(biz => new Date(biz.created_at).getTime())];
    const datesB = [new Date(b.mainAccount.created_at).getTime(), ...b.subAccounts.map(biz => new Date(biz.created_at).getTime())];
    return Math.max(...datesB) - Math.max(...datesA);
  });

  // ============================================================================
  // THE FIX 3: IN-MEMORY SERVER SLICE FOR HIERARCHICAL PAGINATION
  // ============================================================================
  const totalItems = processedPortfolios.length;
  const paginatedPortfolios = processedPortfolios.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Tenant & Billing Orchestration</h2>
        <p className="text-neutral-500 mt-1">Review, approve, and manage SaaS subscriptions for all platform organizations.</p>
      </div>

      <Card className="shadow-sm border-neutral-200 bg-white">
        <CardContent className="p-4 md:p-5">
          <form method="GET" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            
            {/* THE FIX 4: Reset Page to 1 when a new search/filter is executed! */}
            <input type="hidden" name="page" value="1" />
            
            <div className="lg:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Global Search</Label>
              <Input name="search" placeholder="Search owner name, email, phone, or workspace..." defaultValue={params?.search} className="bg-neutral-50 border-neutral-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Plan Tier</Label>
              <Select name="tier" defaultValue={params?.tier || "all"}>
                <SelectTrigger className="bg-neutral-50 border-neutral-200"><SelectValue placeholder="All Plans" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="essential">Essential</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Billing Status</Label>
              <Select name="billing" defaultValue={params?.billing || "all"}>
                <SelectTrigger className="bg-neutral-50 border-neutral-200"><SelectValue placeholder="All Billing States" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Active (Paid)</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex flex-col justify-end gap-2 h-full">
              <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:block">&nbsp;</Label>
              <div className="flex gap-2 w-full">
                <Button type="submit" className="bg-neutral-900 text-white flex-1 hover:bg-neutral-800 shadow-sm transition-all">Filter</Button>
                {(params?.search || params?.tier || params?.billing || params?.status) && (
                  <Link href="/admin/businesses" className="flex-1"><Button variant="outline" className="text-neutral-500 w-full border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button></Link>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* THE FIX 5: Layout adjust for Pagination placement */}
      <Card className="shadow-sm border-neutral-200 overflow-hidden flex flex-col bg-white">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-200 py-4 shrink-0">
          <CardTitle className="text-lg">Workspace Management</CardTitle>
          <CardDescription>Hierarchical view of primary workspaces and their sub-organizations.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
            <thead className="bg-neutral-100/50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-neutral-600">Workspace Name</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">Workspace Type</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">Plan & Billing</th>
                <th className="px-6 py-4 font-semibold text-neutral-600">System Status</th>
                <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Actions</th>
              </tr>
            </thead>
            {paginatedPortfolios.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-neutral-500 bg-white">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-neutral-100 rounded-full text-neutral-400"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
                      <p className="text-base font-medium text-neutral-900">No workspaces found</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              paginatedPortfolios.map((portfolio) => (
                <tbody key={portfolio.mainAccount.id} className="border-b-[6px] border-neutral-100/80 bg-white">
                  
                  {/* PRIMARY WORKSPACE (ROOT NODE) */}
                  <tr className="hover:bg-neutral-50/60 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex gap-3">
                        <div className="mt-1 text-neutral-400"><ChevronDown size={18} /></div>
                        <div>
                          <div className="flex items-center gap-2"><p className="font-bold text-neutral-900 text-base">{portfolio.mainAccount.business_name}</p></div>
                          <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">ID: {portfolio.mainAccount.id.split('-')[0]} • Reg: {new Date(portfolio.mainAccount.created_at).toLocaleDateString()}</p>
                          <div className="mt-3 flex items-start gap-2.5 p-2.5 rounded-lg bg-neutral-50 border border-neutral-100 w-max pr-6">
                            <div className="h-8 w-8 rounded bg-neutral-800 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0">{portfolio.ownerDetails?.full_name?.charAt(0)?.toUpperCase() || 'U'}</div>
                            <div className="flex flex-col justify-center">
                              <span className="text-xs font-bold text-neutral-900">{portfolio.ownerDetails?.full_name || 'Unknown Owner'}</span>
                              <span className="text-[10px] text-neutral-500 flex items-center gap-1.5 mt-0.5"><Mail size={10} className="text-neutral-400" /> {portfolio.ownerDetails?.email || 'No email'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top pt-6"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">Primary Workspace</span></td>
                    <td className="px-6 py-5 align-top pt-6">{renderPlanAndBilling(portfolio.mainAccount)}</td>
                    <td className="px-6 py-5 align-top pt-6">{renderSystemStatus(portfolio.mainAccount)}</td>
                    <td className="px-6 py-5 align-top pt-6 text-right">
                      <div className="flex flex-col items-end gap-2.5">
                        <div className="flex items-center gap-1.5 pb-2.5 border-b border-neutral-100 w-full justify-end">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mr-2">Owner Controls:</span>
                          <OwnerProfileDialog owner={portfolio.ownerDetails} businesses={[portfolio.mainAccount, ...portfolio.subAccounts]} />
                          {portfolio.ownerDetails?.id && <ManageOrgLimitButton ownerId={portfolio.ownerDetails.id} ownerName={portfolio.ownerDetails.full_name || 'Unknown'} currentLimit={portfolio.ownerDetails.max_businesses_limit || 1} />}
                        </div>
                        <div className="flex items-center gap-1.5 w-full justify-end flex-wrap max-w-[600px]">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mr-2">Workspace Setup:</span>
                          {portfolio.mainAccount.status === 'pending' ? (
                            <ApproveTenantDialog businessId={portfolio.mainAccount.id} businessName={portfolio.mainAccount.business_name} />
                          ) : (
                            <>
                              <ManageBillingDialog businessId={portfolio.mainAccount.id} businessName={portfolio.mainAccount.business_name} currentStatus={portfolio.mainAccount.subscription_status || 'trial'} />
                              <ManageFeaturesButton businessId={portfolio.mainAccount.id} businessName={portfolio.mainAccount.business_name} currentReceiptStatus={portfolio.mainAccount.allow_receipt_uploads !== false} />
                              
                              <ManagePayrollButton businessId={portfolio.mainAccount.id} businessName={portfolio.mainAccount.business_name} currentAccess={portfolio.mainAccount.has_payroll_access} />
                              <ManageInventoryButton businessId={portfolio.mainAccount.id} businessName={portfolio.mainAccount.business_name} currentAccess={portfolio.mainAccount.has_inventory_access} />
                              
                              <ManagePlannerButton businessId={portfolio.mainAccount.id} businessName={portfolio.mainAccount.business_name} currentAccess={portfolio.mainAccount.has_planner_access} />
                              <ManageReportsButton businessId={portfolio.mainAccount.id} businessName={portfolio.mainAccount.business_name} currentAccess={portfolio.mainAccount.has_reports_access} />

                              <ManageLimitButton businessId={portfolio.mainAccount.id} businessName={portfolio.mainAccount.business_name} currentLimit={portfolio.mainAccount.max_staff_limit ?? 1} />
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* SUB-WORKSPACES */}
                  {portfolio.subAccounts.map((biz, index) => {
                    const isLast = index === portfolio.subAccounts.length - 1;
                    return (
                      <tr key={biz.id} className="hover:bg-neutral-50/80 transition-colors group bg-neutral-50/40">
                        <td className="px-6 py-4 relative pl-[52px]">
                          <div className={`absolute left-[29px] top-0 w-[2px] bg-neutral-200 transition-all ${isLast ? 'h-[24px]' : 'h-full'}`}></div>
                          <div className="absolute left-[29px] top-[24px] w-[14px] h-[2px] bg-neutral-200 transition-all"></div>
                          <div className="ml-14">
                            <p className="font-bold text-neutral-700 text-sm">{biz.business_name}</p>
                            <div className="flex flex-col gap-0.5 mt-1">
                              <p className="text-[10px] text-neutral-500 font-medium">↳ Attached to: <span className="text-neutral-700">{portfolio.ownerDetails?.email || 'Unknown Owner'}</span></p>
                              <p className="text-[10px] text-neutral-400 font-mono">ID: {biz.id.split('-')[0]} • Reg: {new Date(biz.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-600 border border-neutral-300">Sub-Workspace</span></td>
                        <td className="px-6 py-4">{renderPlanAndBilling(biz)}</td>
                        <td className="px-6 py-4">{renderSystemStatus(biz)}</td>
                        <td className="px-6 py-4 text-right">
                          {biz.status === 'pending' ? (
                            <ApproveTenantDialog businessId={biz.id} businessName={biz.business_name} />
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 flex-wrap max-w-[600px] ml-auto">
                              <ManageBillingDialog businessId={biz.id} businessName={biz.business_name} currentStatus={biz.subscription_status || 'trial'} />
                              <ManageFeaturesButton businessId={biz.id} businessName={biz.business_name} currentReceiptStatus={biz.allow_receipt_uploads !== false} />
                              
                              <ManagePayrollButton businessId={biz.id} businessName={biz.business_name} currentAccess={biz.has_payroll_access} />
                              <ManageInventoryButton businessId={biz.id} businessName={biz.business_name} currentAccess={biz.has_inventory_access} />
                              
                              <ManagePlannerButton businessId={biz.id} businessName={biz.business_name} currentAccess={biz.has_planner_access} />
                              <ManageReportsButton businessId={biz.id} businessName={biz.business_name} currentAccess={biz.has_reports_access} />

                              <ManageLimitButton businessId={biz.id} businessName={biz.business_name} currentLimit={biz.max_staff_limit ?? 1} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))
            )}
          </table>
        </div>
        
        {/* THE FIX 6: Render the Universal Pagination UI */}
        <TablePagination 
          totalItems={totalItems} 
          itemsPerPage={ITEMS_PER_PAGE} 
          currentPage={currentPage} 
        />
      </Card>
    </div>
  );
}