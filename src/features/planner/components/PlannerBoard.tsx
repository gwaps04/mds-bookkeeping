// src/features/planner/components/PlannerBoard.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, ChevronRight, CheckCircle2, Search, Plus } from "lucide-react";
import GoalCard from "./GoalCard";

export default function PlannerBoard({ initialGoals, currency }: { initialGoals: any[], currency: string }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGoals = initialGoals.filter(goal => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (goal.title?.toLowerCase() || "").includes(lowerQuery) ||
      (goal.description?.toLowerCase() || "").includes(lowerQuery)
    );
  });

  const planned = filteredGoals.filter(g => g.status === 'PLANNED');
  const inProgress = filteredGoals.filter(g => g.status === 'IN_PROGRESS');
  const achieved = filteredGoals.filter(g => g.status === 'ACHIEVED');

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">Strategic Planner</h2>
          <p className="text-sm text-neutral-500 mt-1">Owner-exclusive operational notes and budget planning.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <Input 
              placeholder="Search notes or titles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 sm:h-10 bg-white border-neutral-200 w-full"
            />
          </div>
          <GoalCard isNew={true} currency={currency} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start flex-1 min-h-[600px]">
        <div className="bg-neutral-100/70 border border-neutral-200 rounded-xl p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-neutral-700 uppercase tracking-wider text-xs flex items-center gap-2">
              <Target size={14} className="text-neutral-500" /> Planned ({planned.length})
            </h3>
          </div>
          <div className="space-y-3 flex-1">
            {planned.length === 0 && <p className="text-xs text-neutral-400 italic p-4 text-center border-2 border-dashed border-neutral-200 rounded-lg">No planned goals found.</p>}
            {planned.map(goal => <GoalCard key={goal.id} goal={goal} currency={currency} />)}
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-blue-800 uppercase tracking-wider text-xs flex items-center gap-2">
              <ChevronRight size={14} className="text-blue-500" /> In Progress ({inProgress.length})
            </h3>
          </div>
          <div className="space-y-3 flex-1">
            {inProgress.length === 0 && <p className="text-xs text-blue-400 italic p-4 text-center border-2 border-dashed border-blue-200 rounded-lg">Nothing currently in progress.</p>}
            {inProgress.map(goal => <GoalCard key={goal.id} goal={goal} currency={currency} />)}
          </div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-emerald-800 uppercase tracking-wider text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Achieved ({achieved.length})
            </h3>
          </div>
          <div className="space-y-3 flex-1">
            {achieved.length === 0 && <p className="text-xs text-emerald-400 italic p-4 text-center border-2 border-dashed border-emerald-200 rounded-lg">No completed goals found.</p>}
            {achieved.map(goal => <GoalCard key={goal.id} goal={goal} currency={currency} />)}
          </div>
        </div>
      </div>
    </div>
  );
}