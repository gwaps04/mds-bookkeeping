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
  // 1. Use string state to allow the input to temporarily hold an empty value while typing
  const [limitInput, setLimitInput] = useState<string>(currentLimit.toString());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    // 2. Coerce the final value right before sending it to the database
    const finalLimit = Math.max(1, parseInt(limitInput) || 1);

    startTransition(async () => {
      const result = await updateOwnerOrgLimit(ownerId, finalLimit);
      if (result.error) {
        setError(result.error);
      } else {
        setLimitInput(finalLimit.toString()); // Reset to the clean number
        setIsOpen(false);
      }
    });
  };

  const handleIncrement = () => {
    setLimitInput((prev) => (parseInt(prev) || 1) + 1 + "");
  };

  const handleDecrement = () => {
    setLimitInput((prev) => {
      const val = parseInt(prev) || 1;
      return val > 1 ? (val - 1).toString() : "1"; // Prevent going below 1
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string (for backspacing) or numbers only
    if (val === "" || /^[0-9\b]+$/.test(val)) {
      setLimitInput(val);
    }
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
            <p className="text-sm text-neutral-500 mb-6">Owner: <span className="font-semibold text-neutral-700">{ownerName}</span></p>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}

            <label className="block text-sm font-medium text-neutral-700 mb-2">Allowed Organizations</label>
            
            {/* 3. THE MOBILE-RESPONSIVE STEPPER UI */}
            <div className="flex items-center w-full">
              <button 
                onClick={handleDecrement}
                className="w-12 h-12 flex items-center justify-center bg-neutral-100 border border-neutral-300 rounded-l-md hover:bg-neutral-200 active:bg-neutral-300 transition-colors text-neutral-700 text-xl font-bold shrink-0"
                type="button"
                aria-label="Decrease limit"
              >
                −
              </button>
              
              <input 
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                value={limitInput}
                onChange={handleChange}
                className="h-12 w-full border-y border-neutral-300 px-4 py-2 text-center text-base font-semibold text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
              />
              
              <button 
                onClick={handleIncrement}
                className="w-12 h-12 flex items-center justify-center bg-neutral-100 border border-neutral-300 rounded-r-md hover:bg-neutral-200 active:bg-neutral-300 transition-colors text-neutral-700 text-xl font-bold shrink-0"
                type="button"
                aria-label="Increase limit"
              >
                +
              </button>
            </div>

            <div className="mt-8 flex justify-end gap-2">
              <button onClick={() => setIsOpen(false)} disabled={isPending} className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-all active:scale-95 flex items-center justify-center min-w-[100px]">
                {isPending ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Save Limit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}