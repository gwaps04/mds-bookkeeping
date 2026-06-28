// src/components/SideNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

interface Company {
  id: string;
  business_name: string;
}

interface SideNavProps {
  role?: string;
  isTaxEnabled?: boolean;
  companies?: Company[];
  activeCompanyId?: string;
}

export default function SideNav({ role, isTaxEnabled, companies = [], activeCompanyId }: SideNavProps) {
  const pathname = usePathname();

  const isSuperAdmin = role === 'super_admin';
  const isBusinessOwner = role === 'business_owner';

  const checkActive = (path: string) => pathname === path || (pathname.startsWith(path) && path !== '/dashboard');

  const NavLink = ({ href, children, extraClasses = "" }: { href: string, children: React.ReactNode, extraClasses?: string }) => {
    const active = checkActive(href);
    return (
      <Link href={href} className={`block px-3 py-2 text-sm rounded-md transition-colors ${extraClasses} ${
        active 
          ? "bg-neutral-100 text-neutral-900 font-bold shadow-sm" 
          : "text-neutral-600 font-medium hover:bg-neutral-50 hover:text-neutral-900"
      }`}>
        {children}
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      {/* 1. WORKSPACE SWITCHER */}
      {isBusinessOwner && companies.length > 0 && activeCompanyId && (
        <div className="px-4 pt-6 pb-2">
          <WorkspaceSwitcher 
            companies={companies} 
            activeCompanyId={activeCompanyId} 
          />
        </div>
      )}

      {/* 2. NAVIGATION LINKS */}
      <nav className={`flex-1 px-4 space-y-2 overflow-y-auto ${!isBusinessOwner ? 'py-6' : 'pb-6'}`}>
        <NavLink href="/dashboard">Dashboard</NavLink>
        
        {isSuperAdmin ? (
          <>
            <NavLink href="/admin/businesses">Tenant Approvals</NavLink>
            <div className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-400 cursor-not-allowed">
              System Logs
            </div>
          </>
        ) : (
          <>
            <NavLink href="/clients">Client Directory</NavLink>
            <NavLink href="/accounts">Chart of Accounts</NavLink>
            <NavLink href="/transactions">Transactions</NavLink>
            <NavLink href="/invoices">Invoices</NavLink>
            <NavLink href="/income">Income & Sales</NavLink>
            <NavLink href="/expenses">Expenses</NavLink>

            {isTaxEnabled && (
              <Link href="/taxes" className={`block px-3 py-2 text-sm rounded-md border mt-2 transition-colors ${
                checkActive('/taxes')
                  ? "bg-blue-100 text-blue-900 border-blue-200 font-bold shadow-sm"
                  : "bg-blue-50 text-blue-700 border-blue-100 font-medium hover:bg-blue-100"
              }`}>
                BIR Tax Tracker
              </Link>
            )}

            {isBusinessOwner && (
              <>
                <NavLink href="/team" extraClasses="border-t border-neutral-200 mt-4 pt-4">Team Management</NavLink>
                <NavLink href="/settings">Business Settings</NavLink>
                <Link href="/audit" className={`block px-3 py-2 text-sm rounded-md mt-2 transition-colors ${
                  checkActive('/audit')
                    ? "bg-red-100 text-red-900 font-bold shadow-sm"
                    : "bg-red-50 text-red-700 font-medium hover:bg-red-100"
                }`}>
                  Security & Audit
                </Link>
              </>
            )}
          </>
        )}
      </nav>
    </div>
  );
}