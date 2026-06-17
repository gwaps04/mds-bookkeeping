// src/components/UserProfile.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { logout } from "../features/auth/actions";

export default function UserProfile({
  email,
  roleLabel,
  businessName
}: {
  email: string;
  roleLabel: string;
  businessName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Automatically close the dropdown if the user clicks anywhere else on the screen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* THE CLICKABLE BADGE */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center focus:outline-none transition-transform hover:scale-105 active:scale-95"
      >
        <div className="h-9 w-9 rounded-full bg-neutral-900 flex items-center justify-center font-semibold text-white shadow-sm ring-2 ring-transparent focus:ring-neutral-300">
          {email.charAt(0).toUpperCase()}
        </div>
      </button>

      {/* THE DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-neutral-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
            <p className="font-bold text-neutral-900 truncate">{businessName}</p>
            <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-wider">{roleLabel}</p>
            <p className="text-sm text-neutral-500 mt-1 truncate">{email}</p>
          </div>
          <div className="p-2">
            <form action={logout}>
              <button type="submit" className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors font-medium">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}