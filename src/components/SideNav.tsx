// src/components/SideNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { Crown } from "lucide-react";

interface Company {
  id: string;
  business_name: string;
}

interface SideNavProps {
  role?: string;
  isTaxEnabled?: boolean;
  hasInventoryAccess?: boolean; // THE FIX: Added the new ERP provisioning flag
  companies?: Company[];
  activeCompanyId?: string;
}

interface NavItem {
  name: string;
  href: string;
  isPro?: boolean;
  disabled?: boolean;
  style?: "tax" | "audit" | string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// THE FIX: Destructure the new hasInventoryAccess prop
export default function SideNav({ role, isTaxEnabled, hasInventoryAccess, companies = [], activeCompanyId }: SideNavProps) {
  const pathname = usePathname();
  const isSuperAdmin = role === 'super_admin';
  const isBusinessOwner = role === 'business_owner';

  const checkActive = (path: string) => pathname === path || (pathname.startsWith(path) && path !== '/dashboard');

  const navGroups: NavGroup[] = isSuperAdmin ? [
    {
      title: "Super Admin",
      items: [
        { name: "Tenant Approvals", href: "/admin/businesses" },
        { name: "System Logs", href: "#", disabled: true }
      ]
    }
  ] : [
    {
      title: "Overview",
      items: [
        { name: "Dashboard", href: "/dashboard" }
      ]
    },
    {
      title: "Finance",
      items: [
        { name: "Chart of Accounts", href: "/accounts" },
        { name: "Transactions", href: "/transactions" },
        { name: "Invoices", href: "/invoices" },
        { name: "Income & Sales", href: "/income" },
        { name: "Expenses", href: "/expenses" },
        ...(isTaxEnabled ? [{ name: "BIR Tax Tracker", href: "/taxes", style: "tax" }] : [])
      ]
    },
    {
      title: "Business",
      items: [
        { name: "Client Directory", href: "/clients" },
        { name: "Business Planner", href: "/planner", isPro: true },
        // THE FIX: Conditionally render the Inventory module!
        ...(hasInventoryAccess ? [{ name: "Inventory", href: "/inventory", isPro: true }] : []),
        { name: "Payroll", href: "/payroll", isPro: true },
        { name: "Reports", href: "/reports", isPro: true },
      ]
    },
    ...(isBusinessOwner ? [{
      title: "Administration",
      items: [
        { name: "Team Management", href: "/team" },
        { name: "Business Settings", href: "/settings" },
        { name: "Security & Audit", href: "/audit", style: "audit" },
      ]
    }] : [])
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* WORKSPACE SWITCHER */}
      {isBusinessOwner && companies.length > 0 && activeCompanyId && (
        <div className="px-4 pt-6 pb-2">
          <WorkspaceSwitcher 
            companies={companies} 
            activeCompanyId={activeCompanyId} 
          />
        </div>
      )}

      {/* CATEGORIZED NAVIGATION ENGINE */}
      <nav className={`flex-1 px-4 overflow-y-auto ${!isBusinessOwner ? 'py-6' : 'pb-6 pt-2'}`}>
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-6">
            
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
              {group.title}
            </h3>
            
            <div className="space-y-1">
              {group.items.map((item, itemIdx) => {
                const active = checkActive(item.href);
                
                let baseClasses = "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ";
                
                if (item.disabled) {
                  baseClasses += "text-neutral-400 cursor-not-allowed font-medium";
                } else if (item.style === 'tax') {
                  baseClasses += active 
                    ? "bg-blue-100 text-blue-900 border border-blue-200 font-bold shadow-sm" 
                    : "bg-blue-50/50 text-blue-700 border border-blue-100 font-medium hover:bg-blue-100";
                } else if (item.style === 'audit') {
                  baseClasses += active 
                    ? "bg-red-100 text-red-900 font-bold shadow-sm" 
                    : "bg-red-50/50 text-red-700 font-medium hover:bg-red-100";
                } else {
                  baseClasses += active 
                    ? "bg-neutral-100 text-neutral-900 font-bold shadow-sm" 
                    : "text-neutral-600 font-medium hover:bg-neutral-50 hover:text-neutral-900";
                }

                return item.disabled ? (
                  <div key={itemIdx} className={baseClasses}>{item.name}</div>
                ) : (
                  <Link key={itemIdx} href={item.href} className={baseClasses}>
                    <span>{item.name}</span>
                    
                    {item.isPro && (
                      <span className="flex items-center gap-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest shadow-sm border border-amber-200/50">
                        <Crown size={10} className="fill-amber-500 text-amber-600" /> Pro
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}