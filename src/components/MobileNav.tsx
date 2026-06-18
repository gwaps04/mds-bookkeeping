// src/components/MobileNav.tsx
"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation"; // <-- Imported the URL checker!

export default function MobileNav({ role, isTaxEnabled }: { role?: string, isTaxEnabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  
  const isSuperAdmin = role === 'super_admin';
  const isBusinessOwner = role === 'business_owner';

  const checkActive = (path: string) => pathname === path || (pathname.startsWith(path) && path !== '/dashboard');

  const NavLink = ({ href, children, extraClasses = "" }: { href: string, children: React.ReactNode, extraClasses?: string }) => {
    const active = checkActive(href);
    return (
      <Link href={href} onClick={() => setOpen(false)} className={`block px-3 py-2 text-sm rounded-md transition-colors ${extraClasses} ${
        active 
          ? "bg-neutral-100 text-neutral-900 font-bold shadow-sm" 
          : "text-neutral-600 font-medium hover:bg-neutral-50 hover:text-neutral-900"
      }`}>
        {children}
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-white p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <div className="h-16 flex items-center px-6 border-b border-neutral-200 shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">MDS Ledger</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <NavLink href="/dashboard">Dashboard</NavLink>
          
          {isSuperAdmin ? (
            <>
              <NavLink href="/admin/businesses">Tenant Approvals</NavLink>
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
                <Link href="/taxes" onClick={() => setOpen(false)} className={`block px-3 py-2 text-sm rounded-md border mt-2 transition-colors ${
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
                  <Link href="/audit" onClick={() => setOpen(false)} className={`block px-3 py-2 text-sm rounded-md mt-2 transition-colors ${
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
      </SheetContent>
    </Sheet>
  );
}