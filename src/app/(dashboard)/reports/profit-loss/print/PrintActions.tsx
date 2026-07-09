// src/app/(dashboard)/reports/profit-loss/print/PrintActions.tsx
"use client";

import { Printer, FileDown } from "lucide-react";

export default function PrintActions() {
  
  // THE FIX: Removed the blocked useEffect timer. 
  // We strictly rely on the user clicking the button to satisfy Browser Security.
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed top-0 left-0 w-full bg-blue-50 border-b border-blue-200 p-3 print:hidden flex justify-between items-center z-50 shadow-sm">
      
      {/* THE FIX: Highly visible instructions replacing the auto-timer */}
      <div className="ml-4 hidden sm:block">
        <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider">Report Ready for Export</h3>
        <p className="text-xs font-semibold text-blue-700 mt-0.5">
          Action Required: Click Download below, then select <b>"Save as PDF"</b> in the destination window.
        </p>
      </div>

      <div className="flex gap-2 w-full sm:w-auto sm:mr-4 justify-end">
        <button 
          onClick={() => window.close()} 
          className="px-4 py-2 bg-white border border-neutral-200 rounded-md text-sm font-medium shadow-sm hover:bg-neutral-50 transition-colors"
        >
          Close
        </button>
        
        <button 
          onClick={handlePrint} 
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <FileDown size={16} /> Download PDF
        </button>

        <button 
          onClick={handlePrint} 
          className="px-4 py-2 bg-neutral-900 text-white rounded-md text-sm font-medium shadow-sm flex items-center gap-2 hover:bg-neutral-800 transition-colors"
        >
          <Printer size={16} /> Print
        </button>
      </div>
    </div>
  );
}