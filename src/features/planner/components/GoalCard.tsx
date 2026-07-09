// src/features/planner/components/GoalCard.tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus, Trash2, Save, AlignLeft } from "lucide-react";
import { createGoal, updateGoal, deleteGoal } from "../actions";

export default function GoalCard({ goal, isNew = false, currency }: { goal?: any, isNew?: boolean, currency: string }) {
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
      <SheetTrigger asChild>
        {isNew ? (
          <Button className="w-full sm:w-auto h-11 sm:h-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold">
            <Plus size={16} className="mr-2" /> New Strategic Goal
          </Button>
        ) : (
          <div className={`p-4 bg-white border rounded-lg shadow-sm transition-colors cursor-pointer text-left
            ${goal.status === 'PLANNED' ? 'border-neutral-200 hover:border-indigo-300' : ''}
            ${goal.status === 'IN_PROGRESS' ? 'border-blue-200 hover:border-blue-400' : ''}
            ${goal.status === 'ACHIEVED' ? 'border-emerald-200 opacity-70 hover:opacity-100' : ''}
          `}>
            <h4 className={`font-bold text-sm leading-tight ${goal.status === 'ACHIEVED' ? 'text-neutral-500 line-through decoration-neutral-300' : 'text-neutral-900'}`}>
              {goal.title}
            </h4>
            
            {goal.description && (
              <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <AlignLeft size={10} /> Has Notes
              </div>
            )}
            
            {goal.target_date && goal.status !== 'ACHIEVED' && (
              <p className="text-[10px] font-bold text-neutral-400 mt-1.5 flex items-center uppercase tracking-wider">
                <Calendar size={10} className="mr-1"/> Due: {new Date(goal.target_date).toLocaleDateString()}
              </p>
            )}
            
            {goal.budget_allocation > 0 && goal.status !== 'ACHIEVED' && (
              <p className="text-xs font-bold text-indigo-600 mt-2 bg-indigo-50 inline-block px-2 py-0.5 rounded">
                Budget: {formatCurrency(goal.budget_allocation)}
              </p>
            )}
          </div>
        )}
      </SheetTrigger>

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
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
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