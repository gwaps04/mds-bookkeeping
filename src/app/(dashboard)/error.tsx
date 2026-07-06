// src/app/(dashboard)/error.tsx
"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if you have one
    console.error("Dashboard Boundary Caught:", error);
  }, [error]);

  // Check if this error came from our SaaS Subscription Engine
  const isSaaSLockout = error.message.includes("SaaS Lockout");

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
      
      <div className={`p-5 rounded-full shadow-sm ${isSaaSLockout ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
        {isSaaSLockout ? <Lock size={40} /> : <AlertTriangle size={40} />}
      </div>
      
      <div className="space-y-2 max-w-lg">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
          {isSaaSLockout ? "Action Denied: Subscription Required" : "System Error Encountered"}
        </h2>
        <p className="text-neutral-500 leading-relaxed">
          {/* This prints our polite message: "Account Pending Administrator Approval..." */}
          {error.message.replace("SaaS Lockout: ", "")}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <button 
          onClick={() => reset()} 
          className="px-5 py-2.5 bg-neutral-100 text-neutral-700 rounded-md text-sm font-semibold hover:bg-neutral-200 transition-colors"
        >
          Try Again
        </button>
        
        {isSaaSLockout && (
          <Link 
            href="/dashboard" 
            className="px-5 py-2.5 bg-amber-600 text-white rounded-md text-sm font-semibold hover:bg-amber-700 transition-colors shadow-sm"
          >
            Return to Dashboard
          </Link>
        )}
      </div>
      
    </div>
  );
}