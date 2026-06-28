// src/app/(dashboard)/admin/businesses/ManageOrgLimitButton.tsx
"use client";

import { useState, useTransition } from "react";
import { updateOwnerOrgLimit } from "@/features/businesses/actions";

interface ManageOrgLimitButtonProps {
  ownerId: string;
  ownerName: string;
  currentLimit: number;
}

export default function ManageOrgLimitButton({ ownerId, ownerName, currentLimit }: ManageOrgLimitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [limit, setLimit] = useState<number>(currentLimit);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateOwnerOrgLimit(ownerId, limit);
      if (result.error) setError(result.error);
      else setIsOpen(false);
    });
  };

  return (
    <div className="mt-2">
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 px-2 py-1 rounded transition-colors"
      >
        Max Orgs: {currentLimit} <span>✎</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border border-neutral-200 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-neutral-900 mb-1">Account Tier: Max Orgs</h3>
            <p className="text-sm text-neutral-500 mb-4">Owner: <span className="font-semibold text-neutral-700">{ownerName}</span></p>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}

            <label className="block text-sm font-medium text-neutral-700 mb-1">Allowed Organizations</label>
            <input 
              type="number" 
              min="1"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
              className="w-full border border-neutral-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-neutral-900 outline-none"
            />

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setIsOpen(false)} disabled={isPending} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md">Cancel</button>
              <button onClick={handleSave} disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md">
                {isPending ? "Saving..." : "Save Limit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}