// src/app/(dashboard)/invoices/[id]/print/PrintActions.tsx
"use client";

import { Printer, FileDown } from "lucide-react";

export default function PrintActions() {
  
  const handleDownloadPDF = () => {
    alert(
      "To download your Invoice as a PDF:\n\n" +
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
      <div className="ml-4">
        <h3 className="text-sm font-bold text-neutral-900">Invoice Print Preview</h3>
        <p className="text-xs text-neutral-500">A4 Document Format</p>
      </div>

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
          <Printer size={16} /> Print
        </button>
      </div>
    </div>
  );
}