// src/app/(dashboard)/inventory/page.tsx
import { createClient } from "@/lib/supabase/server";
import ItemRowActions from "@/features/inventory/components/ItemRowActions"; 
import AddItemForm from "@/features/inventory/components/AddItemForm"; 
import LogStockMovementForm from "@/features/inventory/components/LogStockMovementForm"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { AlertCircle, CheckCircle2, PackageMinus, Info, PackageSearch, PackageOpen, Search, XCircle } from "lucide-react";

// THE FIX 1: Import Universal Pagination Component
import TablePagination from "@/components/TablePagination";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InventoryPage(props: { 
  // THE FIX 2: Added "page" to the Search Params
  searchParams: Promise<{ search?: string, page?: string }> 
}) {
  const params = await props.searchParams;
  const searchStr = params?.search?.toLowerCase() || '';

  // PAGINATION SETUP
  const ITEMS_PER_PAGE = 50;
  const currentPage = parseInt(params?.page || '1');
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("business_id, businesses(currency)").eq("id", user?.id).single();
  const businessId = profile?.business_id;
  
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const currency = bizData?.currency || "PHP";

  // ============================================================================
  // THE FIX 3: THE FORM QUERY (Lightweight bypass for Dropdowns)
  // We only fetch exactly what the dropdowns need so we don't break the UI.
  // ============================================================================
  const { data: formItems } = await supabase
    .from("items")
    .select("id, name, type, quantity_on_hand")
    .eq("business_id", businessId)
    .eq("is_archived", false);

  // ============================================================================
  // THE FIX 4: THE TABLE QUERY (Paginated, Heavy Data)
  // Notice { count: 'exact' } and .range(from, to) are applied!
  // ============================================================================
  let query = supabase
    .from("items")
    .select("*", { count: 'exact' })
    .eq("business_id", businessId)
    .eq("is_archived", false) 
    .in("type", ["SELLABLE_SIMPLE", "SUPPLY", "RAW_MATERIAL", "SELLABLE_COMPOSITE"]);

  if (searchStr) {
    query = query.ilike("name", `%${searchStr}%`);
  }

  // Sort by updated_at so newly active items jump to top, apply pagination limits
  query = query.order("updated_at", { ascending: false }).range(from, to);
  
  const { data: items, count } = await query;
  const totalItems = count || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-2xl mx-auto pb-12">
      
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Inventory Catalog</h2>
        <p className="text-neutral-500 mt-1">Manage sellable products, internal supplies, recipes, and manual stock movements.</p>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="w-full">
            <h3 className="text-sm font-bold text-blue-900">Quick Guide: How this Ledger works</h3>
            <div className="grid md:grid-cols-2 gap-8 mt-3">
              
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-200/50 pb-1">1. Item Classifications</p>
                <div className="text-xs text-blue-800/80 space-y-2.5">
                  <p><span className="font-semibold text-blue-900 text-[13px] block mb-0.5">Sellable Products</span> Standalone items you sell. Stock is <span className="font-semibold underline">automatically deducted</span> when invoiced.</p>
                  <p><span className="font-semibold text-blue-900 text-[13px] block mb-0.5">Internal Supplies</span> Consumables used to run the business. Manual deduction only.</p>
                  <p><span className="font-semibold text-blue-900 text-[13px] block mb-0.5">Raw Materials</span> Ingredients used to build recipes. Hidden from invoices.</p>
                  <p><span className="font-semibold text-blue-900 text-[13px] block mb-0.5">Composite / Menu Items</span> Products built from a recipe. Selling one automatically deducts its raw materials!</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800 border-b border-blue-200/50 pb-1">2. Stock Movements</p>
                <div className="text-xs text-blue-800/80 space-y-2.5">
                  <p><span className="font-semibold text-blue-900 text-[13px] block mb-0.5">Receive Delivery (+ Stock-In)</span> Use this when a supplier delivers new items (like Coffee Beans or Supplies) to your warehouse.</p>
                  <p><span className="font-semibold text-blue-900 text-[13px] block mb-0.5">Manual Use (- Stock-Out)</span> Use this when employees consume internal supplies, or to remove damaged/lost products from the ledger.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 items-start">
        
        {/* LEFT COLUMN: ACTIONS */}
        <div className="space-y-6 lg:col-span-1 lg:sticky lg:top-8">
          {/* CREATE ITEM CARD */}
          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100">
              <CardTitle className="text-lg flex items-center gap-2"><PackageSearch className="w-5 h-5 text-neutral-500" /> Add Catalog Item</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {/* NOTE: We pass the lightweight formItems here so the dropdown works perfectly! */}
              <AddItemForm rawMaterials={formItems?.filter(i => i.type === 'RAW_MATERIAL') || []} />
            </CardContent>
          </Card>

          {/* STOCK MOVEMENT CARD */}
          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="bg-blue-50/50 border-b border-blue-100">
              <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-blue-600" /> Log Stock Movement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {/* NOTE: We pass the lightweight formItems here too! */}
              <LogStockMovementForm items={formItems || []} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: DATA TABLE WITH SEARCH */}
        <div className="lg:col-span-2">
          
          <form method="GET" className="flex items-center gap-2 mb-4 bg-white p-2 rounded-lg shadow-sm border border-neutral-200">
            
            {/* THE FIX 5: Reset Page to 1 when a new search is executed! */}
            <input type="hidden" name="page" value="1" />
            
            <Search className="w-5 h-5 text-neutral-400 ml-2" />
            <Input name="search" placeholder="Search catalog by item name..." defaultValue={searchStr} className="border-none shadow-none focus-visible:ring-0 text-base" />
            {searchStr && (
              <Link href="/inventory" className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors">
                <XCircle className="w-5 h-5" />
              </Link>
            )}
            <Button type="submit" className="bg-neutral-900 text-white hover:bg-neutral-800 shrink-0 px-6">Search</Button>
          </form>

          {/* THE FIX 6: Flex layout applied to Card so Pagination stays at the bottom */}
          <Card className="shadow-sm border-neutral-200 flex flex-col bg-white">
            <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 py-4 shrink-0">
              <CardTitle className="text-lg">Current Stock Levels</CardTitle>
            </CardHeader>
            
            <CardContent className="p-0 flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                  <thead className="bg-white border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-neutral-600">Item Details</th>
                      <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Pricing</th>
                      <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Qty on Hand</th>
                      <th className="px-6 py-4 font-semibold text-neutral-600 text-center">Status</th>
                      <th className="px-6 py-4 font-semibold text-neutral-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {(!items || items.length === 0) ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                          {searchStr ? "No items match your search query." : "No items in catalog. Add an item to get started."}
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const qty = Number(item.quantity_on_hand);
                        const threshold = Number(item.reorder_threshold);
                        
                        const isNegative = qty < 0;
                        const isLow = qty <= threshold && qty >= 0;
                        const isHealthy = qty > threshold;

                        return (
                          <tr key={item.id} className="hover:bg-neutral-50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-neutral-900">{item.name}</p>
                                
                                {item.type === 'SUPPLY' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">Supply</span>}
                                {item.type === 'SELLABLE_SIMPLE' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">Sellable</span>}
                                {item.type === 'RAW_MATERIAL' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">Raw Material</span>}
                                {item.type === 'SELLABLE_COMPOSITE' && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Composite / Menu</span>}
                              </div>
                              <p className="text-[11px] text-neutral-400 font-mono mt-1">
                                {item.sku ? `SKU: ${item.sku}` : 'No SKU'} • Unit: {item.unit_of_measure}
                              </p>
                            </td>
                            
                            <td className="px-6 py-4 text-right">
                              {item.type === 'SUPPLY' || item.type === 'RAW_MATERIAL' ? (
                                <p className="font-medium text-neutral-500 italic">Not for Sale</p>
                              ) : (
                                <p className="font-medium text-neutral-900">{formatCurrency(Number(item.selling_price))}</p>
                              )}
                              <p className="text-[10px] text-neutral-400 mt-0.5">Cost: {formatCurrency(Number(item.unit_cost))}</p>
                            </td>
                            
                            <td className="px-6 py-4 text-right">
                              <span className={`font-bold text-base ${isNegative ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-neutral-900'}`}>
                                {qty.toLocaleString()}
                              </span>
                            </td>
                            
                            <td className="px-6 py-4 text-center">
                              {isHealthy && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 size={12} className="mr-1" /> Healthy</span>}
                              {isLow && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle size={12} className="mr-1" /> Low Stock</span>}
                              {isNegative && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 shadow-sm animate-pulse"><PackageMinus size={12} className="mr-1" /> Negative</span>}
                            </td>

                            <td className="px-6 py-4 text-right">
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

            {/* THE FIX 7: Render the Universal Pagination UI */}
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