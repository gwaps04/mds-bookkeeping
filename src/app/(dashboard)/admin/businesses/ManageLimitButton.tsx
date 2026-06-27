// src/app/(dashboard)/admin/businesses/ManageLimitButton.tsx
"use client";

import { useState, useTransition } from "react";
import { updateTenantStaffLimit } from "@/features/businesses/actions";

interface ManageLimitButtonProps {
  businessId: string;
  businessName: string;
  currentLimit: number;
}

export default function ManageLimitButton({ businessId, businessName, currentLimit }: ManageLimitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [limit, setLimit] = useState<number>(currentLimit);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateTenantStaffLimit(businessId, limit);
      
      if (result.error) {
        setError(result.error);
      } else {
        setIsOpen(false); // Close modal on success
      }
    });
  };

  return (
    <>
      {/* 1. THE TRIGGER BUTTON */}
      <button 
        onClick={() => setIsOpen(true)}
        className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
      >
        Edit Limit ({currentLimit})
      </button>

      {/* 2. THE POPUP MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-neutral-200 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Manage Staff Limit</h3>
                <p className="text-sm text-neutral-500">Tenant: <span className="font-semibold text-neutral-700">{businessName}</span></p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Maximum Allocated Staff Seats
                </label>
                <input 
                  type="number" 
                  min="0"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
                  className="w-full border border-neutral-300 rounded-md px-4 py-2 text-neutral-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-xs text-neutral-500 mt-2">
                  Setting this to 0 will prevent the owner from adding any staff members.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 active:scale-95 rounded-md transition-all flex items-center justify-center min-w-[100px]"
              >
                {isPending ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}