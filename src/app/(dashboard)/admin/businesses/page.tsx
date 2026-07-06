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
import ApproveTenantDialog from "./ApproveTenantDialog";
import ManageBillingDialog from "./ManageBillingDialog";
import Link from "next/link";
import React from "react";

export default async function SuperAdminBusinessesPage(props: { 
  searchParams: Promise<{ search?: string, tier?: string, billing?: string, status?: string }> 
}) {
  const params = await props.searchParams;
  const searchStr = params?.search?.toLowerCase() || '';
  const tierFilter = params?.tier || 'all';
  const billingFilter = params?.billing || 'all';
  const statusFilter = params?.status || 'all';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id).single();
  if (profile?.role !== 'super_admin') redirect("/dashboard");

  // 1. FETCH RAW DATA (Including mobile_number for searchability)
  const { data: businesses } = await supabase
    .from("businesses")
    .select(`
      id,
      business_name,
      status,
      subscription_status,
      subscription_tier,
      trial_ends_at,
      created_at,
      max_staff_limit,
      allow_receipt_uploads,
      profiles ( id, full_name, email, mobile_number, role, max_businesses_limit )
    `)
    // We order ASC first to guarantee the oldest account is ALWAYS index 0
    .order("created_at", { ascending: true });

  // ============================================================================
  // 2. THE IN-MEMORY DATA PIPELINE & GROUPING ENGINE
  // ============================================================================
  const portfoliosMap = new Map<string, { ownerDetails: any; mainAccountId: string; businesses: any[] }>();

  (businesses || []).forEach((biz) => {
    const isArray = Array.isArray(biz.profiles);
    const owner = isArray ? (biz.profiles as any[]).find(p => p.role === 'business_owner') : biz.profiles;
    const ownerId = owner?.id || `unassigned-${biz.id}`; // Fallback for orphaned accounts
    
    if (!portfoliosMap.has(ownerId)) {
      portfoliosMap.set(ownerId, {
        ownerDetails: owner,
        mainAccountId: biz.id, // The first one inserted is the Main Account
        businesses: []
      });
    }
    portfoliosMap.get(ownerId)?.businesses.push(biz);
  });

  // 3. FILTERING & SORTING ENGINE
  let processedPortfolios = Array.from(portfoliosMap.values());

  processedPortfolios = processedPortfolios.map(portfolio => {
    // A. Apply exact filters to the businesses within the portfolio
    let filteredBiz = portfolio.businesses;

    if (tierFilter !== 'all') {
      filteredBiz = filteredBiz.filter(b => (b.subscription_tier || 'essential').toLowerCase() === tierFilter.toLowerCase());
    }
    if (billingFilter !== 'all') {
      filteredBiz = filteredBiz.filter(b => (b.subscription_status || 'trial').toLowerCase() === billingFilter.toLowerCase());
    }
    if (statusFilter !== 'all') {
      filteredBiz = filteredBiz.filter(b => (b.status || 'pending').toLowerCase() === statusFilter.toLowerCase());
    }

    return { ...portfolio, businesses: filteredBiz };
  }).filter(portfolio => {
    // B. Remove the portfolio entirely if no businesses matched the filters
    if (portfolio.businesses.length === 0) return false;

    // C. Apply the Global Search (Name, Email, Phone, or Business Name)
    if (searchStr) {
      const ownerName = (portfolio.ownerDetails?.full_name || '').toLowerCase();
      const ownerEmail = (portfolio.ownerDetails?.email || '').toLowerCase();
      const ownerPhone = (portfolio.ownerDetails?.mobile_number || '').toLowerCase();
      const hasMatchingBiz = portfolio.businesses.some(b => b.business_name.toLowerCase().includes(searchStr));
      
      return ownerName.includes(searchStr) || ownerEmail.includes(searchStr) || ownerPhone.includes(searchStr) || hasMatchingBiz;
    }
    
    return true;
  });

  // D. THE FIX: Sort Portfolios DESCENDING so the newest customers are at the top!
  processedPortfolios.sort((a, b) => {
    const dateA = new Date(a.businesses[0]?.created_at || 0).getTime();
    const dateB = new Date(b.businesses[0]?.created_at || 0).getTime();
    return dateB - dateA;
  });
  // ============================================================================

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Tenant & Billing Orchestration</h2>
        <p className="text-neutral-500 mt-1">Review, approve, and manage SaaS subscriptions for all platform organizations.</p>
      </div>

      {/* THE TRIAGE CONTROL CENTER */}
      <Card className="shadow-sm border-neutral-200 bg-white">
        <CardContent className="p-4 md:p-5">
          <form method="GET" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            
            <div className="lg:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Global Search</Label>
              <Input 
                name="search" 
                placeholder="Search owner name, email, phone, or workspace..." 
                defaultValue={params?.search} 
                className="bg-neutral-50 border-neutral-200"
              />
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
                  <Link href="/admin/businesses" className="flex-1">
                    <Button variant="outline" className="text-neutral-500 w-full border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button>
                  </Link>
                )}
              </div>
            </div>

          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-neutral-200">
        <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4">
          <CardTitle className="text-lg">Registered SaaS Portfolios</CardTitle>
          <CardDescription>Master list of all owners and their associated workspaces.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[1000px]">
              <thead className="bg-white border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Workspace Name</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Hierarchy</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">Plan & Billing</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600">System Status</th>
                  <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {processedPortfolios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-neutral-500 bg-neutral-50/30">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 bg-neutral-100 rounded-full text-neutral-400">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <p className="text-base font-medium text-neutral-900">No portfolios found</p>
                        <p className="text-sm text-neutral-500">Adjust your search or filters to see results.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedPortfolios.map((portfolio, pIndex) => (
                    <React.Fragment key={portfolio.ownerDetails?.id || pIndex}>
                      
                      {/* ================================================================== */}
                      {/* 1. THE OWNER PORTFOLIO HEADER ROW */}
                      {/* ================================================================== */}
                      <tr className="bg-neutral-100/60 border-y border-neutral-200">
                        <td colSpan={5} className="px-6 py-3.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-md bg-neutral-800 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                                {portfolio.ownerDetails?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-neutral-900 text-base flex items-center gap-2">
                                  {portfolio.ownerDetails?.full_name || 'Unassigned / Unknown Owner'}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                                  <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> {portfolio.ownerDetails?.email || 'No email registered'}</span>
                                  {portfolio.ownerDetails?.mobile_number && (
                                    <span className="flex items-center gap-1 border-l border-neutral-300 pl-3"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> {portfolio.ownerDetails.mobile_number}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {portfolio.ownerDetails?.id && (
                              <ManageOrgLimitButton 
                                ownerId={portfolio.ownerDetails.id} 
                                ownerName={portfolio.ownerDetails.full_name || 'Unknown'} 
                                currentLimit={portfolio.ownerDetails.max_businesses_limit || 1} 
                              />
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ================================================================== */}
                      {/* 2. THE CHILD WORKSPACE ROWS */}
                      {/* ================================================================== */}
                      {portfolio.businesses.map((biz) => {
                        // THE FIX: We identify the Main Account structurally, independent of filtering!
                        const isMainAccount = biz.id === portfolio.mainAccountId; 
                        
                        const hasReceipts = biz.allow_receipt_uploads !== false; 
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
                          <tr key={biz.id} className="hover:bg-neutral-50/80 transition-colors group">
                            
                            <td className="px-6 py-4 pl-12 relative">
                              <div className="absolute left-6 top-0 bottom-0 w-px bg-neutral-200"></div>
                              <div className="absolute left-6 top-1/2 w-4 h-px bg-neutral-200"></div>
                              
                              <p className="font-bold text-neutral-900">{biz.business_name}</p>
                              <p className="text-xs text-neutral-400 mt-1 font-mono">ID: {biz.id.split('-')[0]}</p>
                            </td>
                            
                            <td className="px-6 py-4">
                              {isMainAccount ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-900 text-white shadow-sm">
                                  Main Account
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-200 text-neutral-600 border border-neutral-300">
                                  Sub-Account
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              {biz.status === 'pending' ? (
                                <span className="text-xs text-neutral-400 italic">Awaiting Provisioning</span>
                              ) : (
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
                                    <span className="text-[11px] font-medium text-blue-600 mt-1">
                                      Expires: {new Date(biz.trial_ends_at).toLocaleDateString()}
                                    </span>
                                  )}
                                  {isActive && (
                                    <span className="text-[11px] font-medium text-emerald-600 mt-1">Good Standing</span>
                                  )}
                                  {(isSuspended || isCanceled || isPastDue) && (
                                    <span className="text-[11px] font-medium text-red-600 mt-1 animate-pulse">Account Locked</span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                biz.status === 'active' 
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 border' 
                                  : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${biz.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                                {biz.status ? biz.status : 'UNKNOWN'}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                              {biz.status === 'pending' ? (
                                <ApproveTenantDialog businessId={biz.id} businessName={biz.business_name} />
                              ) : (
                                <div className="flex items-center justify-end gap-2 flex-wrap max-w-[280px] ml-auto">
                                  <ManageBillingDialog 
                                    businessId={biz.id} 
                                    businessName={biz.business_name}
                                    currentStatus={subStatus}
                                  />
                                  <ManageFeaturesButton 
                                    businessId={biz.id} 
                                    businessName={biz.business_name}
                                    currentReceiptStatus={hasReceipts}
                                  />
                                  <ManageLimitButton 
                                    businessId={biz.id} 
                                    businessName={biz.business_name} 
                                    currentLimit={biz.max_staff_limit ?? 1} 
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}