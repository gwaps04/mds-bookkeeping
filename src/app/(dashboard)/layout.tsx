// src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logout } from "@/features/auth/actions";
import MobileNav from "@/components/MobileNav";
import UserProfile from "@/components/UserProfile";
import SideNav from "@/components/SideNav";
import Footer from "@/components/Footer"; 
import RealtimeSync from "@/components/RealtimeSync";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // --- DATABASE FETCH ---
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id, full_name, businesses(status, business_name, is_tax_registered)")
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

  // --- WORKSPACE FETCH ---
  let ownedCompanies: any[] = [];
  if (isBusinessOwner) {
    const { data: companies } = await supabase
      .from("businesses")
      .select("id, business_name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    
    if (companies) ownedCompanies = companies;
  }

  // Prepare data for the User Profile Dropdown
  const displayRole = isSuperAdmin ? 'Super Admin' : isStaff ? 'Staff' : 'Business Owner';
  const displayBusinessName = isSuperAdmin ? 'MacroBiz System Control' : (rawBusinessName || 'Pending Business');

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
            <p>MacroBiz Administration is currently reviewing the registration. You will be granted access to the ledger once approved.</p>
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
     
      {/* INJECT THE REALTIME NOTIFICATION BELL GLOBALLY */}
      <RealtimeSync />

      {/* DESKTOP SIDEBAR */}
      <aside className="w-64 bg-white border-r border-neutral-200 hidden md:flex flex-col print:hidden">
        <div className="h-16 flex items-center px-6 border-b border-neutral-200 shrink-0">
          {/* BRANDING UPDATE 1: Desktop Sidebar */}
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">MacroBiz</h1>
        </div>
        
        {/* INJECT THE INTELLIGENT SIDEBAR COMPONENT */}
        <SideNav 
          role={profile?.role} 
          isTaxEnabled={isTaxEnabled} 
          companies={ownedCompanies} 
          activeCompanyId={profile?.business_id} 
        />
        
        <div className="p-4 border-t border-neutral-200 shrink-0">
          <form action={logout}>
            <button type="submit" className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
              Secure Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-neutral-200 flex items-center px-6 justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav role={profile?.role} isTaxEnabled={isTaxEnabled} />
            {/* BRANDING UPDATE 2: Mobile Header */}
            <span className="font-bold text-lg tracking-tight">MacroBiz</span>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            <UserProfile 
              email={user.email || 'User'} 
              roleLabel={displayRole} 
              businessName={displayBusinessName} 
              fullName={profile?.full_name}
            />
          </div>
        </header>

        {/* PAGE CONTENT & FOOTER WRAPPER */}
        <main className="flex-1 overflow-auto flex flex-col print:overflow-visible print:bg-white">
          
          <div className="flex-1 p-6 md:p-8 w-full max-w-6xl mx-auto print:p-0">
            {children}
          </div>
          
          <div className="print:hidden">
            <Footer />
          </div>

        </main>
      </div>
    </div>
  );
}