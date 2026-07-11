// src/app/(dashboard)/payslip/[id]/PayslipActions.tsx
"use client";

import { Printer, ArrowLeft, Download } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PayslipActions({ runId }: { runId: string }) {
  const router = useRouter();

  const handleDownload = () => {
    alert("To save this Payslip as a PDF:\n\n1. The Print Dialog will open.\n2. Change the Destination to 'Save as PDF'.\n3. Click Save.");
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 print:hidden bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
      
      {/* The Back Button dynamically returns to the specific Payroll Run! */}
      <button 
        onClick={() => router.push(`/payroll/${runId}`)}
        className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors w-full sm:w-auto justify-center"
      >
        <ArrowLeft size={16} /> Back to Payroll Run
      </button>

      <div className="flex gap-2 w-full sm:w-auto">
        <button 
          onClick={handleDownload}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
        >
          <Download size={16} /> Save as PDF
        </button>
        <button 
          onClick={() => window.print()}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
        >
          <Printer size={16} /> Print
        </button>
      </div>
    </div>
  );
}