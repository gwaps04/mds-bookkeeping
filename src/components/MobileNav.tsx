// src/components/MobileNav.tsx
"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Updated to accept the new isTaxEnabled prop
export default function MobileNav({ role, isTaxEnabled }: { role?: string, isTaxEnabled?: boolean }) {
  const [open, setOpen] = useState(false);
  
  const isSuperAdmin = role === 'super_admin';
  const isBusinessOwner = role === 'business_owner';

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
          <Link href="/dashboard" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md bg-neutral-100 text-neutral-900">
            Dashboard
          </Link>
          
          {isSuperAdmin ? (
            <>
              <Link href="/admin/businesses" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900">
                Tenant Approvals
              </Link>
            </>
          ) : (
            <>
              <Link href="/clients" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900">
                Client Directory
              </Link>

              <Link href="/accounts" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900">
                Chart of Accounts
              </Link>
              <Link href="/transactions" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900">
                Transactions
              </Link>
              <Link href="/invoices" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900">
                Invoices
              </Link>
              <Link href="/income" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900">
                Income & Sales
              </Link>
              <Link href="/expenses" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900">
                Expenses
              </Link>

              {/* --- SMART TOGGLE FOR MOBILE --- */}
              {isTaxEnabled && (
                <Link href="/taxes" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-blue-700 bg-blue-50 border border-blue-100 mt-2">
                  BIR Tax Tracker
                </Link>
              )}
              
              {isBusinessOwner && (
                <>
                  <Link href="/team" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 border-t border-neutral-200 mt-4 pt-4">
                    Team Management
                  </Link>
                  <Link href="/settings" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900">
                    Business Settings
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