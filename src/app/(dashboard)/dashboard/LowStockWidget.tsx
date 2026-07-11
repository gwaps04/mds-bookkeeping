// src/app/(dashboard)/dashboard/LowStockWidget.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PackageX, ArrowRight, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

interface LowStockWidgetProps {
  items: any[];
}

export default function LowStockWidget({ items }: LowStockWidgetProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // We use 6 so it forms a perfect 3x2 grid on large screens, or 2x3 on tablets.
  const ITEMS_PER_PAGE = 6; 

  // ============================================================================
  // THE FIX: ACTIVE ZERO-STATE
  // Instead of returning null, we reassure the user that the system is monitoring!
  // ============================================================================
  if (!items || items.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-500 w-full">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-md shrink-0 shadow-sm">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-emerald-900 tracking-tight">Inventory Status: Healthy</h3>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">All monitored catalog items are currently above their reorder thresholds.</p>
          </div>
        </div>
        <Link href="/inventory" className="w-full sm:w-auto shrink-0">
          <Button variant="outline" size="sm" className="w-full sm:w-auto h-10 sm:h-9 bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-bold shadow-sm transition-colors">
            View Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 md:p-6 shadow-sm relative overflow-hidden animate-in fade-in duration-500 w-full">
      <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl pointer-events-none transform translate-x-4 -translate-y-8">⚠️</div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-full bg-red-600 text-white text-base md:text-sm font-bold shadow-sm animate-pulse shrink-0">
            {items.length}
          </span>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-red-900 tracking-tight">Low Stock Alerts</h3>
            <p className="text-xs md:text-sm text-red-700">These items have fallen below their reorder threshold.</p>
          </div>
        </div>
        
        {/* WIDGET PAGINATION CONTROLS */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {totalPages > 1 && (
            <div className="flex items-center gap-1 bg-white border border-red-200 rounded-md p-0.5 shadow-sm">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-700 hover:bg-red-50 hover:text-red-900 rounded disabled:opacity-30"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-[11px] md:text-xs font-bold text-red-800 px-2 min-w-[60px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-700 hover:bg-red-50 hover:text-red-900 rounded disabled:opacity-30"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}

          <Link href="/inventory" className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
            <Button variant="outline" className="w-full sm:w-auto h-10 md:h-9 bg-white text-red-700 border-red-200 hover:bg-red-100 font-bold text-xs md:text-sm shadow-sm transition-colors">
              Manage Stock <ArrowRight size={14} className="ml-1.5 hidden md:block" />
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10 min-h-[140px]">
        {paginatedItems.map((item) => (
          <div key={item.id} className="bg-white p-3 md:p-4 rounded-lg border border-red-100 shadow-sm flex items-center justify-between gap-3 transition-all hover:border-red-300">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-red-50 text-red-600 rounded-md shrink-0 hidden md:block"><PackageX size={16} /></div>
              <div className="min-w-0">
                <p className="font-bold text-neutral-900 text-sm md:text-base truncate">{item.name}</p>
                <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-neutral-500 font-bold truncate">{item.type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="text-right shrink-0 bg-neutral-50 border border-neutral-100 px-2 py-1 rounded">
              <p className="font-black text-red-600 text-sm md:text-base leading-none">{Number(item.quantity_on_hand).toLocaleString()}</p>
              <p className="text-[8px] md:text-[9px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">{item.unit_of_measure}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}