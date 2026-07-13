// src/features/planner/components/GoalCard.tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger as SelectTriggerUI, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Trash2, Save, AlignLeft, Clock, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createGoal, updateGoal, deleteGoal } from "../actions";
import { Card, CardContent } from "@/components/ui/card";

export default function GoalCard({ 
  goal, 
  isNew = false, 
  currency,
  onUpdateStatus // Passed down from the Kanban board to handle optimistic updates
}: { 
  goal?: any, 
  isNew?: boolean, 
  currency: string,
  onUpdateStatus?: (id: string, status: string) => void
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      if (isNew) {
        await createGoal(formData);
      } else {
        formData.append("id", goal.id);
        await updateGoal(formData);
      }
      setOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this plan and all its notes?")) return;
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("id", goal.id);
      await deleteGoal(formData);
      setOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      
      {isNew ? (
        <SheetTrigger asChild>
          <Button className="w-full sm:w-auto h-11 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold">
            <Plus size={16} className="mr-2" /> New Strategic Goal
          </Button>
        </SheetTrigger>
      ) : (
        <Card className="shadow-sm border-neutral-200 bg-white group hover:shadow-md transition-all duration-200 w-full min-w-0 flex flex-col">
          <CardContent className="p-4 md:p-5 flex flex-col h-full w-full min-w-0">
            
            {/* 1. UPPER AREA: CLICK TO EDIT TRIGGER */}
            <SheetTrigger asChild>
              <div className="flex-1 w-full min-w-0 cursor-pointer group-hover:opacity-80 transition-opacity text-left" role="button">
                <h4 className={`font-bold leading-tight mb-2 break-words w-full ${goal.status === 'ACHIEVED' ? 'text-neutral-500 line-through decoration-neutral-300' : 'text-neutral-900'}`}>
                  {goal.title}
                </h4>
                
                {goal.description && (
                  <p className="text-xs text-neutral-500 line-clamp-3 mb-4 break-words w-full">
                    <AlignLeft size={12} className="inline mr-1 -mt-0.5" />
                    {goal.description}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-neutral-600 w-full min-w-0 mb-4">
                  <div className="flex items-center gap-1.5 shrink-0 min-w-0" title="Target Date">
                    <Clock size={14} className="text-neutral-400 shrink-0" />
                    <span className="truncate">{goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'No date'}</span>
                  </div>
                  {Number(goal.budget_allocation) > 0 && (
                    <div className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded shrink-0">
                      {formatCurrency(Number(goal.budget_allocation))}
                    </div>
                  )}
                </div>
              </div>
            </SheetTrigger>

            {/* 2. LOWER AREA: KANBAN ACTION BUTTONS (Separated to prevent click overlap) */}
            {onUpdateStatus && (
              <div className="mt-auto pt-4 border-t border-neutral-100 w-full min-w-0">
                <div className="flex items-center gap-2 w-full min-w-0">
                  {goal.status === 'PLANNED' && (
                    <Button onClick={() => onUpdateStatus(goal.id, 'IN_PROGRESS')} size="sm" className="w-full h-8 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-sm">
                      <span className="truncate">Start Progress</span> <ArrowRight size={14} className="ml-1.5 shrink-0" />
                    </Button>
                  )}

                  {goal.status === 'IN_PROGRESS' && (
                    <>
                      <Button onClick={() => onUpdateStatus(goal.id, 'PLANNED')} variant="outline" size="sm" className="shrink-0 px-2.5 h-8 text-neutral-400 hover:text-neutral-700 shadow-sm" title="Revert to Planned">
                        <ArrowLeft size={14} />
                      </Button>
                      <Button onClick={() => onUpdateStatus(goal.id, 'ACHIEVED')} size="sm" className="flex-1 h-8 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-sm min-w-0">
                        <span className="truncate">Mark Achieved</span> <CheckCircle2 size={14} className="ml-1.5 shrink-0 hidden sm:inline-block" />
                      </Button>
                    </>
                  )}

                  {goal.status === 'ACHIEVED' && (
                    <Button onClick={() => onUpdateStatus(goal.id, 'IN_PROGRESS')} variant="outline" size="sm" className="w-full h-8 text-xs bg-white text-neutral-500 hover:bg-neutral-50 shadow-sm">
                      <ArrowLeft size={14} className="mr-1.5 shrink-0" /> <span className="truncate">Back to In Progress</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      )}

      {/* THE EDIT & DELETE MODAL */}
      <SheetContent side="right" className="w-full sm:max-w-xl bg-white p-0 border-l border-neutral-200 flex flex-col z-[100]">
        <SheetHeader className="p-6 border-b border-neutral-200 bg-neutral-50 shrink-0">
          <SheetTitle className="text-xl font-bold text-neutral-900">
            {isNew ? "Create Strategic Plan" : "Goal Strategy & Notes"}
          </SheetTitle>
          <SheetDescription>
            {isNew ? "Define a new objective and allocate a budget." : "Update the status, adjust the budget, and maintain operational notes."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Goal Title</Label>
              <Input name="title" defaultValue={goal?.title} required placeholder="e.g. Open second branch in Q4" className="bg-white font-medium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Kanban Status</Label>
                <Select name="status" defaultValue={goal?.status || "PLANNED"}>
                  <SelectTriggerUI className="bg-white"><SelectValue /></SelectTriggerUI>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="ACHIEVED">Achieved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Target Date (Optional)</Label>
                <Input name="target_date" type="date" defaultValue={goal?.target_date ? goal.target_date.split('T')[0] : ''} className="bg-white" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Budget Allocation (Optional)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">{currency}</span>
                <Input name="budget_allocation" type="number" step="0.01" min="0" defaultValue={goal?.budget_allocation || ""} placeholder="0.00" className="pl-12 bg-white" />
              </div>
            </div>

            <div className="space-y-1.5 h-64 flex flex-col">
              <Label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Operational Notes</Label>
              <Textarea 
                name="description" 
                defaultValue={goal?.description} 
                placeholder="Type your extensive business notes, vendor links, strategies, and checklists here..." 
                className="bg-white resize-none flex-1 font-mono text-sm leading-relaxed p-4" 
              />
            </div>
          </div>

          <SheetFooter className="p-6 border-t border-neutral-200 bg-neutral-50 shrink-0 flex flex-row items-center justify-between sm:justify-between">
            {!isNew ? (
              <Button type="button" onClick={handleDelete} disabled={isPending} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                <Trash2 size={16} className="mr-2" /> Delete
              </Button>
            ) : <div></div>}
            
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full sm:w-auto">
              <Save size={16} className="mr-2" /> {isPending ? "Saving..." : "Save Strategy"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}