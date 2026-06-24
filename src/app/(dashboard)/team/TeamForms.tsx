// src/app/(dashboard)/team/TeamForms.tsx
"use client";

import { useState } from "react";
import { provisionStaffAccount, resetStaffPassword } from "@/features/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================================================
// 1. PROVISION STAFF FORM (The Secure UI)
// ============================================================================
export function ProvisionStaffForm() {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string, pass: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Grab the data from the form safely
    const formData = new FormData(e.currentTarget);
    const res = await provisionStaffAccount(formData);
    
    if (res?.error) setError(res.error);
    
    // If successful, catch the password and show it on screen!
    if (res?.success && res.password && res.email) {
      setCredentials({ email: res.email, pass: res.password });
    }
    
    setLoading(false);
  }

  // --- THE SECURE REVEAL STATE ---
  // If we have credentials, hide the form and show the password box.
  if (credentials) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-2 text-green-800 font-bold text-lg">
          <span>✓</span> Account Provisioned Successfully
        </div>
        <p className="text-sm text-green-700">Please provide these credentials to your staff member. <strong>This password will never be shown again.</strong></p>
        
        <div className="bg-white p-4 rounded border border-green-100 font-mono text-sm space-y-2">
          <div><span className="text-neutral-400">Email:</span> <span className="font-bold text-neutral-900">{credentials.email}</span></div>
          <div><span className="text-neutral-400">Temp Password:</span> <span className="font-bold text-neutral-900 select-all">{credentials.pass}</span></div>
        </div>

        <Button onClick={() => setCredentials(null)} variant="outline" className="w-full bg-white text-green-800 hover:bg-green-100">
          Clear & Add Another
        </Button>
      </div>
    );
  }

  // --- THE DEFAULT FORM STATE ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded border border-red-100">{error}</div>}
      
      <div className="space-y-2">
        <Label htmlFor="name">Employee Full Name</Label>
        <Input id="name" name="name" placeholder="e.g. Maria Santos" required disabled={loading} />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input id="email" name="email" type="email" placeholder="employee@company.com" required disabled={loading} />
      </div>
      
      <div className="p-4 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100 leading-relaxed">
        <strong>Security Notice:</strong> A highly secure, randomized password will be generated automatically. You will need to copy it on the next screen.
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white hover:bg-neutral-800">
        {loading ? "Provisioning..." : "Provision Account"}
      </Button>
    </form>
  );
}


// ============================================================================
// 2. RESET PASSWORD BUTTON (The 1-Click Action)
// ============================================================================
export function ResetPasswordButton({ userId, email }: { userId: string, email: string }) {
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    // Intercept click to confirm
    if (!window.confirm(`🚨 Are you sure you want to instantly reset the password for ${email}? They will be logged out.`)) return;
    
    setLoading(true);
    const res = await resetStaffPassword(userId, email);
    setLoading(false);

    if (res?.error) alert("Error: " + res.error);
    
    if (res?.success) {
      // Show the new password using a prompt so the owner can easily copy it!
      window.prompt(
        "PASSWORD RESET SUCCESSFUL.\n\nPlease copy the new temporary password below and send it to the staff member:", 
        res.password
      );
    }
  }

  return (
    <Button onClick={handleReset} disabled={loading} variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-orange-600 border-orange-200 hover:bg-orange-50">
      {loading ? "Resetting..." : "Reset Password"}
    </Button>
  );
}