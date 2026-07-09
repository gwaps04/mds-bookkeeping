// src/app/(dashboard)/reports/inventory/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PrintReportButton from "../components/PrintReportButton";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function InventoryValuationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, businesses(business_name, currency)")
    .eq("id", user?.id)
    .single();

  const businessId = profile?.business_id;
  const bizData = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;
  const businessName = bizData?.business_name || "Company Name";
  const currency = bizData?.currency || "PHP";

  // 1. FETCH ALL ACTIVE CATALOG ITEMS
  const { data: items } = await supabase
    .from("items")
    .select("name, sku, type, unit_cost, quantity_on_hand, unit_of_measure")
    .eq("business_id", businessId)
    .eq("is_archived", false)
    .order("name", { ascending: true });

  // 2. THE VALUATION ACCUMULATOR
  let totalAssetValue = 0;
  
  // Grouping by type for a cleaner document
  const groupedItems: Record<string, any[]> = {
    "RAW MATERIALS": [],
    "SELLABLE PRODUCTS": [],
    "INTERNAL SUPPLIES": []
  };

  (items || []).forEach((item) => {
    const qty = Number(item.quantity_on_hand);
    const cost = Number(item.unit_cost);
    const value = qty * cost;
    totalAssetValue += value;

    if (item.type === 'RAW_MATERIAL') groupedItems["RAW MATERIALS"].push({ ...item, value });
    else if (item.type === 'SUPPLY') groupedItems["INTERNAL SUPPLIES"].push({ ...item, value });
    else groupedItems["SELLABLE PRODUCTS"].push({ ...item, value });
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-12 print:p-0 print:m-0 print:space-y-0 print:block print:max-w-none">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports">
            <button className="flex items-center justify-center h-10 w-10 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-full shrink-0 transition-colors">
              <ArrowLeft size={16} className="text-neutral-600" />
            </button>
          </Link>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">Inventory Valuation</h2>
            <p className="text-sm text-neutral-500 mt-1">Real-Time Asset Ledger</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Note: NO DashboardFilter here because Inventory is a real-time snapshot! */}
          <PrintReportButton />
        </div>
      </div>

      {/* THE FINANCIAL STATEMENT DOCUMENT */}
      <Card className="shadow-sm border-neutral-200 bg-white overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <CardContent className="p-0">
          
          <div className="bg-neutral-50 border-b border-neutral-200 p-8 text-center print:bg-white print:border-neutral-900 print:border-b-2">
            <h1 className="text-xl font-black uppercase tracking-widest text-neutral-900">{businessName}</h1>
            <h2 className="text-base font-bold text-neutral-500 mt-1 print:text-neutral-900">INVENTORY VALUATION SUMMARY</h2>
            <p className="text-xs text-neutral-400 mt-1 uppercase tracking-wider print:text-neutral-600">As of: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="p-8 md:p-12 space-y-8 text-sm">
            
            {Object.entries(groupedItems).map(([category, catItems]) => {
              if (catItems.length === 0) return null;
              
              const categoryTotal = catItems.reduce((sum, item) => sum + item.value, 0);

              return (
                <div key={category} className="mb-8">
                  <h3 className="font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-200 pb-2 mb-4">{category}</h3>
                  <table className="w-full text-left">
                    <thead className="text-[10px] uppercase tracking-wider text-neutral-500">
                      <tr>
                        <th className="pb-2">Item Name</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Unit Cost</th>
                        <th className="pb-2 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {catItems.map((item) => (
                        <tr key={item.name} className="text-neutral-700 print:text-neutral-900">
                          <td className="py-2">{item.name} {item.sku && <span className="text-[10px] text-neutral-400 ml-1">({item.sku})</span>}</td>
                          <td className="py-2 text-right font-medium">{item.quantity_on_hand} <span className="text-[10px] text-neutral-400 font-normal">{item.unit_of_measure}</span></td>
                          <td className="py-2 text-right text-neutral-500">{formatCurrency(item.unit_cost)}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(item.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between font-bold text-neutral-900 mt-2 pt-2 border-t border-neutral-200">
                    <span className="text-xs uppercase tracking-wider">Subtotal: {category}</span>
                    <span>{formatCurrency(categoryTotal)}</span>
                  </div>
                </div>
              );
            })}

            {/* GRAND TOTAL ASSET SUMMARY */}
            <div className="mt-8 pt-6 border-t-2 border-neutral-900">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-black text-neutral-900 uppercase tracking-widest text-lg">Total Asset Value</span>
                  <p className="text-xs text-neutral-500 mt-1">Total monetary value of physical inventory.</p>
                </div>
                <span className="font-black text-3xl text-amber-600 print:text-neutral-900">
                  {formatCurrency(totalAssetValue)}
                </span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}