// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { logout } from "../../features/auth/actions";
import MobileNav from "../../components/MobileNav";
import UserProfile from "../../components/UserProfile";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // --- ADDED is_tax_registered TO THE DATABASE FETCH ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id, businesses(status, business_name, is_tax_registered)")
    .eq("id", user.id)
    .single();

  // --- THE RBAC IDENTITY ENGINE ---
  const isSuperAdmin = profile?.role === 'super_admin';
  const isBusinessOwner = profile?.role === 'business_owner';
  const isStaff = profile?.role === 'staff';
  
  const bizData = profile?.businesses as any;
  const businessStatus = Array.isArray(bizData) ? bizData[0]?.status : bizData?.status;
  const rawBusinessName = Array.isArray(bizData) ? bizData[0]?.business_name : bizData?.business_name;
  
  // --- THE SMART TOGGLE ---
  const isTaxEnabled = Array.isArray(bizData) ? bizData[0]?.is_tax_registered : bizData?.is_tax_registered;

  // Prepare data for the User Profile Dropdown
  const displayRole = isSuperAdmin ? 'Super Admin' : isStaff ? 'Staff' : 'Business Owner';
  const displayBusinessName = isSuperAdmin ? 'MDS System Control' : (rawBusinessName || 'Pending Business');

  if (!isSuperAdmin && !profile?.business_id) {
    redirect("/onboarding");
  }

  // The Waiting Room
  if (!isSuperAdmin && businessStatus === 'pending') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg text-center p-6">
          <CardHeader>
            <CardTitle className="text-2xl">Account Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-neutral-500 space-y-6">
            <p>Your business tenant has been provisioned successfully.</p>
            <p>Macrotek Digital Solutions is currently reviewing the registration. You will be granted access to the ledger once approved.</p>
            <form action={logout}>
              <button type="submit" className="text-sm font-medium text-red-600 hover:underline">
                Sign Out
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* DESKTOP SIDEBAR - Added print:hidden here */}
      <aside className="w-64 bg-white border-r border-neutral-200 hidden md:flex flex-col print:hidden">
        <div className="h-16 flex items-center px-6 border-b border-neutral-200 shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">MDS Ledger</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium rounded-md bg-neutral-100 text-neutral-900">
            Dashboard
          </Link>
          
          {isSuperAdmin ? (
            <>
              <Link href="/admin/businesses" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Tenant Approvals
              </Link>
              <div className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-400 cursor-not-allowed">
                System Logs
              </div>
            </>
          ) : (
            <>
              <Link href="/clients" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Client Directory
              </Link>

              <Link href="/accounts" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Chart of Accounts
              </Link>
              <Link href="/transactions" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Transactions
              </Link>
              <Link href="/invoices" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Invoices
              </Link>
              <Link href="/income" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Income & Sales
              </Link>
              <Link href="/expenses" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Expenses
              </Link>

              {/* --- SMART TOGGLE: ONLY SHOWS IF TAX IS ENABLED --- */}
              {isTaxEnabled && (
                <Link href="/taxes" className="block px-3 py-2 text-sm font-medium rounded-md text-blue-700 bg-blue-50 border border-blue-100 mt-2 transition-colors">
                  BIR Tax Tracker
                </Link>
              )}

              {/* --- OWNER EXCLUSIVE LINKS --- */}
              {isBusinessOwner && (
                <>
                  <Link href="/team" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors border-t border-neutral-200 mt-4 pt-4">
                    Team Management
                  </Link>
                  <Link href="/settings" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                    Business Settings
                  </Link>
                </>
              )}
            </>
            
          )}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER - Added print:hidden here */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center px-6 justify-between shrink-0 print:hidden">
          
          <div className="flex items-center gap-2 md:hidden">
            {/* PASS DOWN THE TAX BOOLEAN TO THE MOBILE MENU */}
            <MobileNav role={profile?.role} isTaxEnabled={isTaxEnabled} />
            <span className="font-bold text-lg tracking-tight">MDS Ledger</span>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <UserProfile 
              email={user.email || 'User'} 
              roleLabel={displayRole} 
              businessName={displayBusinessName} 
            />
          </div>
        </header>

        {/* PAGE CONTENT - Added print padding and background resets here */}
        <main className="flex-1 overflow-auto p-6 md:p-8 print:p-0 print:overflow-visible print:bg-white">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}