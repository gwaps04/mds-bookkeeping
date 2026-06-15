// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logout } from "@/features/auth/actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id, businesses(status)")
    .eq("id", user.id)
    .single();

  // --- THE RBAC IDENTITY ENGINE ---
  const isSuperAdmin = profile?.role === 'super_admin';
  const isBusinessOwner = profile?.role === 'business_owner';
  const isStaff = profile?.role === 'staff';
  
  const bizData = profile?.businesses as any;
  const businessStatus = Array.isArray(bizData) ? bizData[0]?.status : bizData?.status;

  if (!isSuperAdmin && !profile?.business_id) {
    redirect("/onboarding");
  }

  // The Waiting Room applies to both BOs and Staff (if the core business is pending)
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
      <aside className="w-64 bg-white border-r border-neutral-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-neutral-200 shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">MDS Ledger</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium rounded-md bg-neutral-100 text-neutral-900">
            Dashboard
          </Link>
          
          {isSuperAdmin ? (
            <>
              <Link href="/clients" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Client Management
              </Link>
              <div className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-400 cursor-not-allowed">
                System Logs
              </div>
            </>
          ) : (
            <>
              <Link href="/accounts" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Chart of Accounts
              </Link>
              <Link href="/transactions" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Transactions
              </Link>
              <Link href="/invoices" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors">
                Invoices
              </Link>
              
              {/* --- NEW: STAFF INVITATION GATE --- */}
              {isBusinessOwner && (
                <Link href="/team" className="block px-3 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors border-t border-neutral-200 mt-4 pt-4">
                  Team Management
                </Link>
              )}
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-neutral-200 shrink-0">
          <form action={logout}>
            <button type="submit" className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
              Secure Sign Out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center px-6 justify-between shrink-0">
          <div className="md:hidden font-bold text-lg">MDS Ledger</div>
          <div className="ml-auto flex items-center space-x-4">
            <span className="text-sm font-medium text-neutral-500 uppercase tracking-wider hidden sm:inline-block">
              {isSuperAdmin ? 'Super Admin' : isStaff ? 'Staff' : 'Business Owner'}
            </span>
            <div className="h-9 w-9 rounded-full bg-neutral-900 flex items-center justify-center font-semibold text-white shadow-sm">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            
            <form action={logout} className="md:hidden">
              <button type="submit" className="text-sm font-medium text-neutral-500 hover:text-red-600 transition-colors">
                Sign Out
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}