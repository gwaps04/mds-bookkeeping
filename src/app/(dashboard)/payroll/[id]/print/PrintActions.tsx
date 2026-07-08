// src/app/(dashboard)/payroll/[id]/print/PrintActions.tsx
"use client";

import { Printer, FileDown, Search, X } from "lucide-react";

export default function PrintActions({ runId, searchStr }: { runId: string, searchStr: string }) {
  
  const handleDownloadPDF = () => {
    alert(
      "To download your Payslips as a PDF:\n\n" +
      "1. The Print Dialog will now open.\n" +
      "2. Change the 'Destination' or 'Printer' to 'Save as PDF'.\n" +
      "3. Click Save!"
    );
    
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="fixed top-0 left-0 w-full bg-white border-b border-neutral-200 p-3 print:hidden flex justify-between items-center z-50 shadow-sm">
      
      {/* 1. NEW SEARCH & FILTER BAR */}
      <form method="GET" className="flex items-center gap-2 ml-4">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-neutral-400" />
          <input 
            type="text" 
            name="search" 
            placeholder="Search employee or position..." 
            defaultValue={searchStr}
            className="pl-8 pr-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:border-indigo-500 w-64 shadow-sm"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-neutral-900 text-white hover:bg-neutral-800 text-sm font-medium rounded-md shadow-sm transition-colors">
          Filter
        </button>
        {searchStr && (
          <a href={`/payroll/${runId}/print`} className="px-3 py-2 bg-rose-50 text-rose-600 text-sm font-medium rounded-md hover:bg-rose-100 transition-colors flex items-center gap-1">
            <X size={14} /> Clear
          </a>
        )}
      </form>

      {/* 2. ORIGINAL ACTIONS */}
      <div className="flex gap-2 mr-4">
        <button 
          onClick={() => window.close()} 
          className="px-4 py-2 bg-white border border-neutral-200 rounded-md text-sm font-medium shadow-sm hover:bg-neutral-50 transition-colors"
        >
          Close
        </button>
        
        <button 
          onClick={handleDownloadPDF} 
          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium shadow-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <FileDown size={16} /> Download PDF
        </button>

        <button 
          onClick={() => window.print()} 
          className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm font-medium shadow-sm flex items-center gap-2 hover:bg-neutral-800 transition-colors"
        >
          {/* Dynamically changes text if a filter is active! */}
          <Printer size={16} /> Print {searchStr ? 'Filtered' : 'All'}
        </button>
      </div>
    </div>
  );
}