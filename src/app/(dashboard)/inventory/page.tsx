// src/app/(dashboard)/inventory/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation"; 
import ItemRowActions from "@/features/inventory/components/ItemRowActions"; 
import AddItemForm from "@/features/inventory/components/AddItemForm"; 
import LogStockMovementForm from "@/features/inventory/components/LogStockMovementForm"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { AlertCircle, CheckCircle2, PackageMinus, Info, PackageSearch, PackageOpen, Search } from "lucide-react";

import TablePagination from "@/components/TablePagination";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InventoryPage(props: { 
  searchParams: Promise<{ search?: string, page?: string }> 
}) {
  const params = await props.searchParams;
  const searchStr = params?.search?.toLowerCase() || '';

  const ITEMS_PER_PAGE = 50;
  const currentPage = parseInt(params?.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(`
      role, 
      can_access_inventory, 
      business_id, 
      businesses(currency, has_inventory_access)
    `)
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  const isSuperAdmin = profile?.role === 'super_admin';
  const isOwner = profile?.role === 'business_owner' || isSuperAdmin;
  const bizHasInventory = bizData?.has_inventory_access === true;

  if (!bizHasInventory && !isSuperAdmin) redirect("/dashboard");
  if (!isOwner && profile?.can_access_inventory !== true) redirect("/dashboard");

  const { data: formItems } = await supabase
    .from("items")
    .select("id, name, type, quantity_on_hand, unit_of_measure, unit_cost")
    .eq("business_id", businessId)
    .eq("is_archived", false);

  let query = supabase
    .from("items")
    .select("*", { count: 'exact' })
    .eq("business_id", businessId)
    .eq("is_archived", false) 
    .in("type", ["SELLABLE_SIMPLE", "SUPPLY", "RAW_MATERIAL", "SELLABLE_COMPOSITE"]);

  if (searchStr) {
    query = query.ilike("name", `%${searchStr}%`);
  }

  query = query.order("updated_at", { ascending: false }).range(from, to);
  
  const { data: items, count } = await query;
  const totalItems = count || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  };

  // THE FIX: Extract Raw Materials so we can pass them to the Edit Modals
  const rawMaterials = items?.filter(i => i.type === 'RAW_MATERIAL') || [];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0 overflow-x-hidden pb-12">
      
      <div className="w-full min-w-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Inventory Catalog</h2>
        <p className="text-sm sm:text-base text-neutral-500 mt-1">Manage sellable products, internal supplies, recipes, and manual stock movements.</p>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 md:p-5 shadow-sm w-full min-w-0">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-md shrink-0 mt-0.5 shadow-sm">
            <Info size={16} />
          </div>
          <div className="w-full min-w-0">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2.5">Quick Guide: How this Ledger works</h3>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
              
              <div className="space-y-2">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-200/50 pb-1">1. Item Classifications</p>
                <div className="text-xs sm:text-sm text-blue-800/90 space-y-2 leading-relaxed">
                  <p><strong className="font-bold text-blue-950">Sellable Products:</strong> Standalone items you sell. Stock is <span className="underline">automatically deducted</span> when invoiced.</p>
                  <p><strong className="font-bold text-blue-950">Internal Supplies:</strong> Consumables used to run the business. Manual deduction only.</p>
                  <p><strong className="font-bold text-blue-950">Raw Materials:</strong> Ingredients used to build recipes. Hidden from invoices.</p>
                  <p><strong className="font-bold text-blue-950">Composite / Menu:</strong> Products built from a recipe. Selling one automatically deducts its raw materials!</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-200/50 pb-1">2. Stock Movements</p>
                <div className="text-xs sm:text-sm text-blue-800/90 space-y-2 leading-relaxed">
                  <p><strong className="font-bold text-blue-950">Receive Delivery (+ In):</strong> Use this when a supplier delivers new items to your warehouse.</p>
                  <p><strong className="font-bold text-blue-950">Manual Use (- Out):</strong> Use this when employees consume internal supplies, or to remove damaged/lost products.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-start w-full min-w-0">
        
        <div className="space-y-6 lg:col-span-1 lg:sticky lg:top-8 w-full min-w-0">
          
          <Card className="shadow-sm border-neutral-200 w-full min-w-0 bg-white">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 pb-4">
              <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <PackageSearch size={18} className="text-neutral-500" /> Add Catalog Item
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <AddItemForm rawMaterials={formItems?.filter(i => i.type === 'RAW_MATERIAL') || []} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-neutral-200 w-full min-w-0 bg-white">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
              <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <PackageOpen size={18} className="text-blue-600" /> Log Movement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <LogStockMovementForm items={formItems || []} />
            </CardContent>
          </Card>

        </div>

        <div className="lg:col-span-2 space-y-4 w-full min-w-0">
          
          <Card className="shadow-sm border-neutral-200 bg-white w-full min-w-0">
            <CardContent className="p-4 md:p-5">
              <form method="GET" className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-end w-full min-w-0">
                <input type="hidden" name="page" value="1" />
                <div className="flex-1 w-full min-w-0 space-y-1.5">
                  <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Search Catalog</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                    <Input name="search" placeholder="Search by item name..." defaultValue={searchStr} className="pl-9 bg-neutral-50 border-neutral-200 focus-visible:ring-neutral-900 w-full" />
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                  <Button type="submit" className="bg-neutral-900 text-white flex-1 sm:flex-none shadow-sm transition-all hover:bg-neutral-800">Search</Button>
                  {searchStr && (
                    <Link href="/inventory" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="w-full text-neutral-600 border-neutral-200 hover:bg-neutral-50 transition-colors">Clear</Button>
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-neutral-200 flex flex-col bg-white overflow-hidden w-full min-w-0">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 shrink-0">
              <CardTitle className="text-lg">Current Stock Levels</CardTitle>
              <CardDescription>Live valuation of your physical assets.</CardDescription>
            </CardHeader>
            
            <CardContent className="p-0 flex-1 w-full overflow-hidden">
              <div className="w-full overflow-x-auto min-w-0">
                <table className="w-full text-left text-sm table-auto">
                  <thead className="bg-white border-b border-neutral-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] w-full">Item Details</th>
                      <th className="hidden sm:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap">Pricing</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap">Stock On Hand</th>
                      <th className="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-center whitespace-nowrap">Status</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] sm:text-[11px] text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {(!items || items.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-neutral-500">
                          {searchStr ? "No items match your search query." : "No items in catalog. Add an item to get started."}
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const qty = Number(item.quantity_on_hand);
                        const threshold = Number(item.reorder_threshold);
                        const isComposite = item.type === 'SELLABLE_COMPOSITE';
                        
                        const isNegative = qty < 0;
                        const isLow = qty <= threshold && qty >= 0;
                        const isHealthy = qty > threshold;

                        const statusBadge = isHealthy ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"><CheckCircle2 size={12} className="mr-1" /> Healthy</span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-sm"><AlertCircle size={12} className="mr-1" /> Low Stock</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 shadow-sm animate-pulse"><PackageMinus size={12} className="mr-1" /> Negative</span>
                        );

                        const pricingBlock = item.type === 'SUPPLY' || item.type === 'RAW_MATERIAL' ? (
                          <div className="flex flex-col items-start sm:items-end">
                            <p className="font-medium text-neutral-500 italic text-[11px] sm:text-xs">Not for Sale</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Cost: {formatCurrency(Number(item.unit_cost))}</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start sm:items-end">
                            <p className="font-bold text-neutral-900 text-sm sm:text-base">{formatCurrency(Number(item.selling_price))}</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Cost: {formatCurrency(Number(item.unit_cost))}</p>
                          </div>
                        );

                        return (
                          <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors group">
                            
                            <td className="px-4 sm:px-6 py-4 whitespace-normal break-words w-full min-w-[160px] align-middle">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                                <p className="font-bold text-neutral-900 text-sm sm:text-base leading-tight">{item.name}</p>
                                
                                {item.type === 'SUPPLY' && <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">Supply</span>}
                                {item.type === 'SELLABLE_SIMPLE' && <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">Sellable</span>}
                                {item.type === 'RAW_MATERIAL' && <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">Raw Mat</span>}
                                {isComposite && <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Menu Item</span>}
                              </div>
                              <p className="text-[10px] sm:text-[11px] text-neutral-400 font-mono">
                                {item.sku ? `SKU: ${item.sku}` : 'No SKU'} • Unit: <span className="uppercase tracking-widest">{item.unit_of_measure}</span>
                              </p>

                              <div className="mt-3 sm:hidden border-t border-neutral-100 pt-2 w-fit pr-4">
                                {pricingBlock}
                              </div>
                            </td>
                            
                            <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-right align-middle whitespace-nowrap">
                              {pricingBlock}
                            </td>
                            
                            <td className="px-4 sm:px-6 py-4 text-right align-middle whitespace-nowrap">
                              <div className={`font-black text-base sm:text-lg leading-none ${isNegative ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-neutral-900'}`}>
                                {qty.toLocaleString()}
                              </div>
                              
                              {qty > 0 && !isComposite && (
                                <div className="text-[10px] font-bold text-purple-600 mt-1.5 uppercase tracking-wider bg-purple-50 inline-block px-1.5 py-0.5 rounded border border-purple-100/50" title="Total Asset Value in Warehouse">
                                  Asset: {formatCurrency(qty * Number(item.unit_cost))}
                                </div>
                              )}

                              <div className="mt-2 md:hidden flex justify-end">
                                {statusBadge}
                              </div>
                            </td>
                            
                            <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-center align-middle whitespace-nowrap">
                              {statusBadge}
                            </td>

                            <td className="px-4 sm:px-6 py-4 text-right align-middle whitespace-nowrap">
                              <div className="flex justify-end">
                                {/* THE FIX: Passing rawMaterials to the Action component */}
                                <ItemRowActions item={item} rawMaterials={rawMaterials} />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
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