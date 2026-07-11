// src/features/planner/components/PlannerBoard.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, CheckCircle2, Clock, Target, MoreHorizontal } from "lucide-react";

export default function PlannerBoard({ initialGoals, currency }: { initialGoals: any[], currency: string }) {
  const [goals, setGoals] = useState(initialGoals);
  const supabase = createClient();
  const router = useRouter();

  // ============================================================================
  // THE FIX: OPTIMISTIC STATE MUTATION
  // Moves the card instantly on the screen, then updates the database silently.
  // ============================================================================
  const updateStatus = async (goalId: string, newStatus: string) => {
    // 1. Optimistic UI Update (Instant visual feedback)
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: newStatus } : g));

    // 2. Background Database Sync
    const { error } = await supabase
      .from("business_goals")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", goalId);

    if (error) {
      alert("Error moving goal: " + error.message);
      router.refresh(); // Revert on failure
    }
  };

  const planned = goals.filter(g => g.status === 'PLANNED');
  const inProgress = goals.filter(g => g.status === 'IN_PROGRESS');
  const achieved = goals.filter(g => g.status === 'ACHIEVED');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  };

  // REUSABLE KANBAN CARD COMPONENT
  const GoalCard = ({ goal }: { goal: any }) => (
    <Card className="shadow-sm border-neutral-200 bg-white group hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 md:p-5 flex flex-col h-full">
        
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-neutral-900 leading-tight pr-2">{goal.title}</h4>
          </div>
          {goal.description && (
            <p className="text-xs text-neutral-500 line-clamp-3 mb-4">{goal.description}</p>
          )}
        </div>

        <div className="mt-auto space-y-3 pt-4 border-t border-neutral-100">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
            <div className="flex items-center gap-1.5" title="Target Date">
              <Clock size={14} className="text-neutral-400" />
              {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'No date'}
            </div>
            {Number(goal.budget_allocation) > 0 && (
              <div className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                {formatCurrency(Number(goal.budget_allocation))}
              </div>
            )}
          </div>

          {/* THE KANBAN ACTION CONTROLS */}
          <div className="flex items-center gap-2 pt-2">
            {goal.status === 'PLANNED' && (
              <Button onClick={() => updateStatus(goal.id, 'IN_PROGRESS')} size="sm" className="w-full h-8 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                Start Progress <ArrowRight size={14} className="ml-1.5" />
              </Button>
            )}

            {goal.status === 'IN_PROGRESS' && (
              <>
                <Button onClick={() => updateStatus(goal.id, 'PLANNED')} variant="outline" size="sm" className="px-2 h-8 text-neutral-400 hover:text-neutral-700" title="Revert to Planned">
                  <ArrowLeft size={14} />
                </Button>
                <Button onClick={() => updateStatus(goal.id, 'ACHIEVED')} size="sm" className="w-full h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                  Mark Achieved <CheckCircle2 size={14} className="ml-1.5" />
                </Button>
              </>
            )}

            {goal.status === 'ACHIEVED' && (
              <Button onClick={() => updateStatus(goal.id, 'IN_PROGRESS')} variant="outline" size="sm" className="w-full h-8 text-xs bg-white text-neutral-500 hover:bg-neutral-50">
                <ArrowLeft size={14} className="mr-1.5" /> Back to In Progress
              </Button>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      
      {/* COLUMN 1: PLANNED */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 min-h-[500px] flex flex-col">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-neutral-900 flex items-center gap-2">
            <Target size={18} className="text-neutral-400" /> Planned
          </h3>
          <span className="text-xs font-bold bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-full">{planned.length}</span>
        </div>
        <div className="space-y-4 flex-1">
          {planned.length === 0 ? (
            <div className="text-center p-8 border-2 border-dashed border-neutral-200 rounded-lg text-neutral-400 text-sm italic">No planned goals.</div>
          ) : (
            planned.map(goal => <GoalCard key={goal.id} goal={goal} />)
          )}
        </div>
      </div>

      {/* COLUMN 2: IN PROGRESS */}
      <div className="bg-blue-50/30 rounded-xl border border-blue-100 p-4 min-h-[500px] flex flex-col shadow-inner">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-blue-900 flex items-center gap-2">
            <Clock size={18} className="text-blue-500" /> In Progress
          </h3>
          <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{inProgress.length}</span>
        </div>
        <div className="space-y-4 flex-1">
          {inProgress.length === 0 ? (
             <div className="text-center p-8 border-2 border-dashed border-blue-100 rounded-lg text-blue-400 text-sm italic">Nothing actively in progress.</div>
          ) : (
            inProgress.map(goal => <GoalCard key={goal.id} goal={goal} />)
          )}
        </div>
      </div>

      {/* COLUMN 3: ACHIEVED */}
      <div className="bg-emerald-50/30 rounded-xl border border-emerald-100 p-4 min-h-[500px] flex flex-col">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" /> Achieved
          </h3>
          <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{achieved.length}</span>
        </div>
        <div className="space-y-4 flex-1">
          {achieved.length === 0 ? (
             <div className="text-center p-8 border-2 border-dashed border-emerald-100 rounded-lg text-emerald-400 text-sm italic">No completed goals yet.</div>
          ) : (
            achieved.map(goal => <GoalCard key={goal.id} goal={goal} />)
          )}
        </div>
      </div>

    </div>
  );
}