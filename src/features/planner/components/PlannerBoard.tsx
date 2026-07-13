// src/features/planner/components/PlannerBoard.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Target, Clock, CheckCircle2 } from "lucide-react";
import GoalCard from "./GoalCard"; // THE FIX: Imported the Master GoalCard

export default function PlannerBoard({ initialGoals, currency }: { initialGoals: any[], currency: string }) {
  const [goals, setGoals] = useState(initialGoals);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    setGoals(initialGoals);
  }, [initialGoals]);

  const updateStatus = async (goalId: string, newStatus: string) => {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: newStatus } : g));

    const { error } = await supabase
      .from("business_goals")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", goalId);

    if (error) {
      alert("Error moving goal: " + error.message);
      router.refresh(); 
    }
  };

  const planned = goals.filter(g => g.status === 'PLANNED');
  const inProgress = goals.filter(g => g.status === 'IN_PROGRESS');
  const achieved = goals.filter(g => g.status === 'ACHIEVED');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full min-w-0">
      
      {/* COLUMN 1: PLANNED */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 min-h-[400px] lg:min-h-[500px] flex flex-col w-full min-w-0">
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
            planned.map(goal => <GoalCard key={goal.id} goal={goal} currency={currency} onUpdateStatus={updateStatus} />)
          )}
        </div>
      </div>

      {/* COLUMN 2: IN PROGRESS */}
      <div className="bg-blue-50/30 rounded-xl border border-blue-100 p-4 min-h-[400px] lg:min-h-[500px] flex flex-col shadow-inner w-full min-w-0">
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
            inProgress.map(goal => <GoalCard key={goal.id} goal={goal} currency={currency} onUpdateStatus={updateStatus} />)
          )}
        </div>
      </div>

      {/* COLUMN 3: ACHIEVED */}
      <div className="bg-emerald-50/30 rounded-xl border border-emerald-100 p-4 min-h-[400px] lg:min-h-[500px] flex flex-col w-full min-w-0">
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
            achieved.map(goal => <GoalCard key={goal.id} goal={goal} currency={currency} onUpdateStatus={updateStatus} />)
          )}
        </div>
      </div>

    </div>
  );
}