// src/app/(dashboard)/reports/page.tsx
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { TrendingUp, ArrowRight, Landmark, Package, Wallet } from "lucide-react";

export default function ReportsHubPage() {
  const reports = [
    {
      id: "profit-loss",
      title: "Profit & Loss Statement",
      description: "Income statement showing revenues, cost of goods sold (COGS), operating expenses, and net profit.",
      icon: <TrendingUp size={24} className="text-indigo-600" />,
      color: "bg-indigo-50 border-indigo-100",
      href: "/reports/profit-loss"
    },
    {
      id: "cash-flow",
      title: "Cash Flow Summary",
      description: "A ledger of literal cash entering and leaving your bank accounts and petty cash registers.",
      icon: <Wallet size={24} className="text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-100",
      href: "/reports/cash-flow"
    },
    {
      id: "inventory",
      title: "Inventory Valuation",
      description: "Total asset value of all physical stock currently sitting in your warehouse or store.",
      icon: <Package size={24} className="text-amber-600" />,
      color: "bg-amber-50 border-amber-100",
      href: "/reports/inventory" // THE FIX: Activated link
    },
    {
      id: "taxes",
      title: "Tax & Compliance",
      description: "Summary of withheld taxes, VAT, and statutory contributions for BIR and DOLE filing.",
      icon: <Landmark size={24} className="text-rose-600" />,
      color: "bg-rose-50 border-rose-100",
      href: "/reports/taxes" // THE FIX: Activated link
    }
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-screen-xl mx-auto pb-12">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">Financial Reports</h2>
        <p className="text-sm md:text-base text-neutral-500 mt-1">Generate standard accounting documents and financial statements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {reports.map((report) => (
          <Link key={report.id} href={report.href} className="block group">
            <Card className="h-full shadow-sm border-neutral-200 bg-white hover:shadow-md transition-all duration-200">
              <CardContent className="p-6 flex items-start gap-5">
                <div className={`p-4 rounded-xl border ${report.color} shrink-0`}>
                  {report.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">{report.title}</h3>
                    <ArrowRight size={16} className="text-neutral-300 group-hover:text-blue-600 transition-colors transform group-hover:translate-x-1" />
                  </div>
                  <p className="text-sm text-neutral-500 leading-relaxed">{report.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}