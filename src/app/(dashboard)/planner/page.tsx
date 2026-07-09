// src/app/(dashboard)/planner/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlannerBoard from "@/features/planner/components/PlannerBoard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PlannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. RBAC SECURITY GATE
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id, businesses(currency)")
    .eq("id", user.id)
    .single();

  // ========================================================================
  // THE FIX: GRACEFUL DEGRADATION FOR STAFF ACCOUNTS
  // Instead of a confusing redirect, we explicitly explain the restriction.
  // ========================================================================
  if (profile?.role === 'staff') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4 animate-in fade-in zoom-in-95 duration-500">
        <Card className="max-w-md w-full shadow-lg border-neutral-200 bg-white text-center overflow-hidden">
          <CardHeader className="bg-neutral-50 border-b border-neutral-100 py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 shadow-sm">
              <Lock size={32} />
            </div>
            <CardTitle className="text-xl font-bold text-neutral-900 tracking-tight">Executive Access Required</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <p className="text-sm text-neutral-600 leading-relaxed">
              The Strategic Planner is a highly restricted module used for high-level business planning, budget allocation, and confidential operational notes.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs font-bold text-amber-800 uppercase tracking-wider">
              Available to Business Owners Only
            </div>
            <Link href="/dashboard" className="block pt-2">
              <Button className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold h-11">
                <ArrowLeft size={16} className="mr-2" /> Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const businessId = profile?.business_id;
  const bizData = profile?.businesses as any;
  const currency = Array.isArray(bizData) ? bizData[0]?.currency : bizData?.currency || "PHP";

  // 2. FETCH GOALS (This block is physically impossible for staff to reach)
  const { data: goals } = await supabase
    .from("business_goals")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  // Pass raw data to the Interactive Client Component
  return <PlannerBoard initialGoals={goals || []} currency={currency} />;
}