// src/app/(dashboard)/planner/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlannerBoard from "@/features/planner/components/PlannerBoard";
import GoalCard from "@/features/planner/components/GoalCard"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft, Info } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PlannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id, businesses(currency)")
    .eq("id", user.id)
    .single();

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

  const { data: goals } = await supabase
    .from("business_goals")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 w-full min-w-0 overflow-x-hidden">
      
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full min-w-0">
        <div className="w-full min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">Business Planner</h2>
          <p className="text-sm md:text-base text-neutral-500 mt-1">Map your operational goals, marketing strategies, and budgets.</p>
        </div>
        
        <div className="shrink-0 w-full sm:w-auto">
          <GoalCard isNew={true} currency={currency} />
        </div>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 md:p-5 shadow-sm w-full min-w-0">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-md shrink-0 mt-0.5">
            <Info size={16} />
          </div>
          <div className="w-full min-w-0">
            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wider mb-2.5">Quick Guide: How to Use the Kanban Board</h3>
            {/* THE FIX: Re-engineered Grid Breakpoints (1 col -> 2 col -> 3 col) + added gap-y-4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs sm:text-sm text-blue-800 leading-relaxed">
              <p><strong className="font-bold text-blue-950 block mb-0.5">1. Planned</strong> Log future ideas, pending marketing campaigns, or unapproved budgets here.</p>
              <p><strong className="font-bold text-blue-950 block mb-0.5">2. In Progress</strong> Use the action buttons to move a goal here when it actively starts consuming time or money.</p>
              <p><strong className="font-bold text-blue-950 block mb-0.5">3. Achieved</strong> Move completed goals here to permanently archive your successes and review your spent budgets.</p>
            </div>
          </div>
        </div>
      </div>

      <PlannerBoard initialGoals={goals || []} currency={currency} />
      
    </div>
  );
}