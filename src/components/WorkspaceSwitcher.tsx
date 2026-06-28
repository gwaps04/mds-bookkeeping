// src/components/WorkspaceSwitcher.tsx
"use client";

import { useState, useTransition } from "react";
import { switchOrganization, createOrganization } from "@/features/businesses/actions";

// Define the shape of our data
interface Company {
  id: string;
  business_name: string;
}

interface WorkspaceSwitcherProps {
  companies: Company[];
  activeCompanyId: string;
}

export default function WorkspaceSwitcher({ companies, activeCompanyId }: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeCompany = companies.find(c => c.id === activeCompanyId);

  const handleSwitch = (businessId: string) => {
    if (businessId === activeCompanyId) return;
    setIsOpen(false);
    startTransition(async () => {
      await switchOrganization(businessId);
    });
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await createOrganization(formData);
      if (result.success) {
        setIsCreating(false);
        setIsOpen(false);
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <div className="relative w-full">
      {/* 1. THE MAIN DROPDOWN TRIGGER BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="w-full flex items-center justify-between bg-neutral-900 text-white px-4 py-3 rounded-lg hover:bg-neutral-800 transition-colors shadow-sm border border-neutral-700"
      >
        <div className="flex items-center gap-3 truncate">
          <div className="h-6 w-6 rounded bg-neutral-700 flex items-center justify-center text-xs font-bold shrink-0">
            {activeCompany?.business_name.charAt(0).toUpperCase() || "O"}
          </div>
          <span className="font-semibold text-sm truncate">
            {isPending ? "Switching..." : (activeCompany?.business_name || "Select Organization")}
          </span>
        </div>
        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {/* 2. THE DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Company List */}
          <div className="max-h-60 overflow-y-auto py-2">
            <div className="px-3 pb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              My Organizations
            </div>
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSwitch(company.id)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 flex items-center justify-between transition-colors"
              >
                <span className={`truncate ${company.id === activeCompanyId ? 'font-bold text-blue-600' : 'text-neutral-700'}`}>
                  {company.business_name}
                </span>
                {company.id === activeCompanyId && (
                  <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            ))}
          </div>

          {/* 3. CREATE NEW COMPANY TOGGLE */}
          <div className="border-t border-neutral-100 p-2 bg-neutral-50">
            {!isCreating ? (
              <button 
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-md py-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create New Organization
              </button>
            ) : (
              /* INLINE CREATION FORM */
              <form onSubmit={handleCreate} className="space-y-3 p-2 bg-white rounded-md border border-neutral-200 shadow-sm animate-in zoom-in-95">
                <input 
                  type="text" 
                  name="business_name"
                  placeholder="Organization Name" 
                  required
                  autoFocus
                  className="w-full text-sm border-b border-neutral-200 px-2 py-1.5 focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsCreating(false)} className="flex-1 text-xs font-medium text-neutral-500 hover:text-neutral-700 py-1.5 bg-neutral-100 rounded">Cancel</button>
                  <button type="submit" disabled={isPending} className="flex-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded py-1.5 shadow-sm disabled:opacity-50">
                    {isPending ? "Creating..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}