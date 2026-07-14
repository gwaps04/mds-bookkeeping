// src/app/(dashboard)/inventory/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { Package, PlusCircle, ArrowDownUp } from "lucide-react";

import AddItemForm from "@/features/inventory/components/AddItemForm";
import LogStockMovementForm from "@/features/inventory/components/LogStockMovementForm";
import ItemRowActions from "@/features/inventory/components/ItemRowActions";

// THE FIX: Explicitly disable Next.js aggressive caching for this route.
// This ensures that when the Server Action revalidates, this page instantly fetches fresh data.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ============================================================================
  // 1. THE GATEKEEPER: Get Profile, RBAC Flags & Business Features
  // ============================================================================
  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      business_id, 
      role, 
      can_access_inventory,
      businesses(has_inventory_access, currency)
    `)
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile?.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // ============================================================================
  // THE HARD GUARD: SERVER-SIDE ROUTE PROTECTION
  // ============================================================================
  const isSuperAdmin = profile?.role === 'super_admin';
  const isOwner = profile?.role === 'business_owner' || isSuperAdmin;

  // Key 1: Business Scope (Does the business pay for Inventory?)
  if (!bizData?.has_inventory_access && !isSuperAdmin) {
    redirect("/settings");
  }

  // Key 2: User Scope (Does the staff member have clearance?)
  if (!isOwner && profile?.can_access_inventory !== true) {
    redirect("/dashboard");
  }
  // ============================================================================

  // 2. Fetch all Active Items for the Catalog Table
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_archived", false)
    .order("name", { ascending: true });

  // 3. Separate Raw Materials specifically for the Recipe Builder dropdown
  const rawMaterials = items?.filter(item => item.type === 'RAW_MATERIAL') || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full min-w-0 overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 w-full min-w-0">
        <div className="w-full min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 text-balance leading-tight">Inventory Engine</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Manage your catalog, build recipes, and track stock levels in real-time.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-start w-full min-w-0">
        
        {/* LEFT COLUMN: THE MUTATION FORMS */}
        <div className="lg:col-span-1 w-full min-w-0 space-y-6 lg:sticky lg:top-8">
          
          {/* LOG MOVEMENT FORM */}
          <Card className="shadow-sm border-neutral-200 bg-white w-full min-w-0">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
              <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <ArrowDownUp size={18} className="text-blue-600" /> Log Stock Movement
              </CardTitle>
              <CardDescription className="text-blue-700/70">Receive deliveries or record damages.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <LogStockMovementForm items={items || []} />
            </CardContent>
          </Card>

          {/* ADD ITEM FORM */}
          <Card className="shadow-sm border-neutral-200 bg-white w-full min-w-0">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
              <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <PlusCircle size={18} className="text-neutral-500" /> Add Catalog Item
              </CardTitle>
              <CardDescription>Create a new product, supply, or recipe.</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <AddItemForm rawMaterials={rawMaterials} />
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN: THE MASTER CATALOG TABLE */}
        <div className="lg:col-span-2 w-full min-w-0">
          <Card className="shadow-sm border-neutral-200 flex flex-col overflow-hidden bg-white w-full min-w-0">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 shrink-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Package size={18} className="text-neutral-500" /> Master Catalog
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-0 flex-1 w-full overflow-hidden">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm table-auto whitespace-nowrap min-w-[700px]">
                  <thead className="bg-white border-b border-neutral-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px]">Item Details</th>
                      <th className="px-4 sm:px-6 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] text-right">In Stock</th>
                      <th className="px-4 sm:px-6 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] text-right">Unit Cost</th>
                      <th className="px-4 sm:px-6 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] text-right">Price</th>
                      <th className="px-4 sm:px-6 py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {(!items || items.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-neutral-500">
                          Your catalog is empty. Add an item to get started.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        
                        // Badge logic for visual distinction
                        let badgeColor = "bg-neutral-100 text-neutral-600 border-neutral-200";
                        let badgeText = "Product";
                        
                        if (item.type === 'RAW_MATERIAL') { badgeColor = "bg-amber-50 text-amber-700 border-amber-200"; badgeText = "Raw Material"; }
                        if (item.type === 'SUPPLY') { badgeColor = "bg-slate-50 text-slate-700 border-slate-200"; badgeText = "Supply"; }
                        if (item.type === 'SELLABLE_COMPOSITE') { badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200"; badgeText = "Composite"; }

                        // Low stock warning logic
                        const isLowStock = Number(item.quantity_on_hand) <= Number(item.reorder_threshold);

                        return (
                          <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors group">
                            
                            {/* ITEM DETAILS */}
                            <td className="px-4 sm:px-6 py-4 align-middle">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm border mb-1.5 ${badgeColor}`}>
                                {badgeText}
                              </span>
                              <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight truncate max-w-[200px]">{item.name}</p>
                              {item.sku && <p className="text-[11px] sm:text-xs text-neutral-400 font-mono mt-0.5">SKU: {item.sku}</p>}
                            </td>
                            
                            {/* QUANTITY */}
                            <td className="px-4 sm:px-6 py-4 text-right align-middle">
                              <div className="flex flex-col items-end">
                                <span className={`font-black text-lg sm:text-xl leading-none ${isLowStock ? 'text-red-600' : 'text-neutral-900'}`}>
                                  {Number(item.quantity_on_hand).toLocaleString()}
                                </span>
                                <span className="text-[10px] sm:text-xs text-neutral-500 font-medium mt-0.5">{item.unit_of_measure}</span>
                                {isLowStock && <span className="text-[9px] font-bold uppercase tracking-wider text-red-500 mt-1 animate-pulse">Low Stock</span>}
                              </div>
                            </td>
                            
                            {/* UNIT COST */}
                            <td className="px-4 sm:px-6 py-4 text-right align-middle font-medium text-neutral-500">
                              {formatCurrency(Number(item.unit_cost))}
                            </td>

                            {/* SELLING PRICE */}
                            <td className="px-4 sm:px-6 py-4 text-right align-middle">
                              {Number(item.selling_price) > 0 ? (
                                <span className="font-bold text-neutral-900">{formatCurrency(Number(item.selling_price))}</span>
                              ) : (
                                <span className="text-xs text-neutral-400 italic">N/A</span>
                              )}
                            </td>
                            
                            {/* ACTIONS (Using the Client Component Modal you provided) */}
                            <td className="px-4 sm:px-6 py-4 text-center align-middle">
                              <ItemRowActions item={item} />
                            </td>

                          </tr>
                        );
                      })
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