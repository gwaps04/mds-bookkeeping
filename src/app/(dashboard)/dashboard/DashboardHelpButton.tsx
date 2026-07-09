// src/app/(dashboard)/dashboard/DashboardHelpButton.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Mail, Phone, BookOpen, Headset, FileText } from "lucide-react";

export default function DashboardHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 px-3 md:px-4 bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:text-blue-600 shadow-sm flex items-center gap-2 transition-all">
          <LifeBuoy size={18} />
          <span className="hidden sm:inline font-semibold">User Guide & Help</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] p-0 flex flex-col overflow-hidden bg-white border-neutral-200 shadow-2xl">
        
        {/* HEADER */}
        <DialogHeader className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-neutral-900">
            <BookOpen className="text-blue-600" size={24} /> 
            MacroBiz Owner&apos;s Manual
          </DialogTitle>
        </DialogHeader>

        {/* SCROLLABLE DIGITAL PDF DOCUMENT */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white">
          
          <div className="text-center mb-8 pb-8 border-b border-neutral-100">
            <h1 className="text-2xl font-black uppercase tracking-widest text-neutral-900">MacroBiz Your Business Guide</h1>
            <p className="text-neutral-500 mt-2 font-medium">The Official Quick-Start Guide for Business Owners[cite: 16]</p>
            <span className="inline-block mt-3 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded border border-blue-100">Version 1.0</span>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> 1. The Basics: Understanding Your Ledger</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">Welcome to MacroBiz. This platform is designed to give you enterprise-grade financial control without requiring a degree in accounting[cite: 16]. Before diving into the modules, remember the Golden Rule of MacroBiz:</p>
            <ul className="list-disc list-outside ml-5 text-sm text-neutral-600 space-y-2 leading-relaxed">
              <li><strong className="text-neutral-900">Physical vs. Financial:</strong> Counting your boxes (Inventory) is different from paying for them (Expenses). Always ensure you track both the physical items and the cash leaving your bank![cite: 16]</li>
              <li><strong className="text-neutral-900">Liquidity vs. Profitability:</strong> Liquidity is the actual cash in your bank. Profitability is how much you earned from sales. MacroBiz strictly separates these to protect your tax liabilities[cite: 16].</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> 2. The Dashboard (Your Back Office)</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">The Dashboard is your real-time financial heartbeat. Use the Date Filter in the top right to switch between your monthly view and your annual fiscal year[cite: 16].</p>
            <ul className="list-disc list-outside ml-5 text-sm text-neutral-600 space-y-2 leading-relaxed">
              <li><strong className="text-neutral-900">Net Cash Balance:</strong> The absolute total of all money in your business (Revenue + Capital Injections - Expenses). This is your actual liquidity[cite: 16].</li>
              <li><strong className="text-neutral-900">Total Revenue:</strong> Strictly tracks money earned from sales and services. It purposefully excludes personal money you inject into the business to ensure your taxes are calculated accurately[cite: 16].</li>
              <li><strong className="text-neutral-900">Cost of Goods (COGS):</strong> The total cost of the raw materials and inventory you consumed to make your sales[cite: 16].</li>
              <li><strong className="text-neutral-900">Gross Profit:</strong> Your Total Revenue minus your Cost of Goods[cite: 16].</li>
              <li><strong className="text-neutral-900">Operating Expenses:</strong> Your overhead costs (rent, payroll, electricity, internet)[cite: 16].</li>
              <li><strong className="text-neutral-900">True Net Income:</strong> The bottom line. Your Gross Profit minus your Operating Expenses[cite: 16].</li>
              <li><strong className="text-neutral-900">Alerts & Approvals:</strong> The system will instantly alert you if stock is running low, or if staff members have requested refunds that require your manager approval[cite: 16].</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> 3. Finance Modules (Money In, Money Out)</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Chart of Accounts</h3>
                <p className="text-sm text-neutral-600 mt-1 mb-2">This is the &quot;brain&quot; of your ledger. You must categorize your money into five distinct buckets[cite: 16]:</p>
                <ol className="list-decimal list-outside ml-5 text-sm text-neutral-600 space-y-1">
                  <li>Asset: Where actual money sits (BDO, GCash, Petty Cash Register)[cite: 16].</li>
                  <li>Revenue: How money is earned (General Sales, Service Income)[cite: 16].</li>
                  <li>Expense: How money is spent (Rent, Payroll, Utilities)[cite: 16].</li>
                  <li>Liability: Money you owe to others (Credit Cards, Bank Loans)[cite: 16].</li>
                  <li>Equity: Money the owner injects into the business (Owner&apos;s Capital)[cite: 16].</li>
                </ol>
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Income & Sales</h3>
                <p className="text-sm text-neutral-600 mt-1">Use this module to record cash receipts, retail sales, or paid invoices[cite: 16]. <br/><strong className="text-blue-700">Pro-Tip:</strong> If you are funding the business out of your own pocket, log it here, but select &quot;Owner&apos;s Capital / Equity&quot; as the category. The system will add it to your bank balance but hide it from your taxable revenue![cite: 16]</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Expenses</h3>
                <p className="text-sm text-neutral-600 mt-1">Whenever you buy physical inventory, pay salaries, or pay a utility bill, you must log the cash leaving your selected Asset account here[cite: 16].</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> 4. Business Operations (The Pro Modules)</h2>
            <ul className="list-disc list-outside ml-5 text-sm text-neutral-600 space-y-2 leading-relaxed">
              <li><strong className="text-neutral-900">Inventory Ledger:</strong> Manage Sellable Products, Internal Supplies, Raw Materials, and Composite/Menu Items[cite: 16].</li>
              <li><strong className="text-neutral-900">Business Planner:</strong> A strategic Kanban board to map out operational notes and budget allocations[cite: 16].</li>
              <li><strong className="text-neutral-900">Payroll:</strong> Manage salaries, generate payslips, calculate commissions, and track statutory deductions[cite: 16].</li>
              <li><strong className="text-neutral-900">Reports:</strong> Generate A4-ready PDF documents like the Profit & Loss Statement for stakeholders or the BIR[cite: 16].</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2"><FileText size={18} className="text-blue-500"/> 5. Administration & Security</h2>
            <ul className="list-disc list-outside ml-5 text-sm text-neutral-600 space-y-2 leading-relaxed">
              <li><strong className="text-neutral-900">Team Management:</strong> MacroBiz relies on controlled Team Management. Owners have ultimate control; Staff can log daily transactions but cannot view overall profitability[cite: 16].</li>
              <li><strong className="text-neutral-900">Security & Audit:</strong> Trust, but verify. The Audit Log permanently records exactly who created, edited, or voided a record and when[cite: 16].</li>
            </ul>
          </section>
        </div>

        {/* STICKY HELP DESK FOOTER */}
        <div className="bg-blue-50/80 border-t border-blue-100 p-6 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-1">
                <Headset size={16} /> Help Desk <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded uppercase tracking-wider font-bold ml-1">Coming Soon</span>
              </h3>
              <p className="text-xs text-blue-700">For direct concerns, technical issues, or billing inquiries, please reach out to our team.</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <a href="mailto:macrotekdigitalsolution@gmail.com" className="flex items-center gap-2 text-sm text-blue-800 font-medium hover:text-blue-600 transition-colors">
                <div className="p-1.5 bg-white rounded shadow-sm text-blue-600"><Mail size={14} /></div>
                macrotekdigitalsolution@gmail.com
              </a>
              <a href="tel:09563355850" className="flex items-center gap-2 text-sm text-blue-800 font-medium hover:text-blue-600 transition-colors">
                <div className="p-1.5 bg-white rounded shadow-sm text-blue-600"><Phone size={14} /></div>
                09563355850
              </a>
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}