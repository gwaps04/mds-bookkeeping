// src/app/(dashboard)/reports/components/PrintReportButton.tsx
"use client";

import { Printer } from "lucide-react";

export default function PrintReportButton() {
  return (
    <button 
      onClick={() => window.print()} 
      className="w-full sm:w-auto flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-11 sm:h-10 px-4 rounded-md font-semibold transition-colors print:hidden"
    >
      <Printer size={16} className="mr-2" /> Download / Print PDF
    </button>
  );
}