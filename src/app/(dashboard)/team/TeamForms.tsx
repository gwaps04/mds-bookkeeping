// src/app/(dashboard)/team/TeamForms.tsx
"use client";

import { useState } from "react";
import { provisionStaffAccount, resetStaffPassword } from "@/features/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle2, KeyRound, AlertTriangle, ShieldCheck } from "lucide-react";

// ============================================================================
// 1. PROVISION STAFF FORM (The Secure UI)
// ============================================================================
export function ProvisionStaffForm() {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string, pass: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(false);
    
    const formData = new FormData(e.currentTarget);
    const res = await provisionStaffAccount(formData);
    
    if (res?.error) setError(res.error);
    
    if (res?.success && res.password && res.email) {
      setCredentials({ email: res.email, pass: res.password });
    }
    
    setLoading(false);
  }

  const handleCopy = () => {
    if (!credentials) return;
    const text = `Login Email: ${credentials.email}\nTemporary Password: ${credentials.pass}\n\nPlease log in and change your password immediately.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- THE SECURE REVEAL STATE ---
  if (credentials) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 space-y-5 animate-in fade-in zoom-in-95 duration-300 shadow-sm">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1 shadow-sm">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="font-bold text-emerald-900 text-lg">Account Provisioned!</h3>
          <p className="text-xs text-emerald-700 max-w-[250px]">Please copy these credentials and send them securely to your new team member.</p>
        </div>
        
        <div className="bg-white p-4 rounded-md border border-emerald-100 space-y-3 shadow-inner">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Email Address</span>
            <span className="font-semibold text-neutral-900">{credentials.email}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Temporary Password</span>
            {/* Monospace is absolutely critical for passwords! */}
            <span className="font-mono font-bold text-lg tracking-widest text-neutral-900 block bg-neutral-50 px-3 py-1.5 rounded border border-neutral-200">
              {credentials.pass}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            type="button" 
            onClick={handleCopy} 
            className={`w-full flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white'}`}
          >
            {copied ? <><CheckCircle2 size={16} /> Copied!</> : <><Copy size={16} /> Copy Credentials</>}
          </Button>
          <Button onClick={() => setCredentials(null)} variant="outline" className="w-full border-neutral-200 text-neutral-600 hover:bg-neutral-50">
            Done
          </Button>
        </div>
      </div>
    );
  }

  // --- THE DEFAULT FORM STATE ---
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-neutral-500">Employee Full Name</Label>
        <Input id="name" name="name" placeholder="e.g. Maria Santos" required disabled={loading} className="focus-visible:ring-blue-600" />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-neutral-500">Email Address</Label>
        <Input id="email" name="email" type="email" placeholder="employee@company.com" required disabled={loading} className="focus-visible:ring-blue-600" />
      </div>
      
      <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-100 leading-relaxed flex items-start gap-2">
        <ShieldCheck size={16} className="shrink-0 mt-0.5 text-blue-600" />
        <p>A highly secure, randomized password will be generated automatically. You will be able to copy it on the next screen.</p>
      </div>

      <Button type="submit" disabled={loading} className="w-full bg-blue-700 text-white hover:bg-blue-800 font-bold transition-all shadow-sm h-11">
        {loading ? "Provisioning..." : "Provision Account"}
      </Button>
    </form>
  );
}


// ============================================================================
// 2. RESET PASSWORD BUTTON (With Secure Overlay Modal)
// ============================================================================
export function ResetPasswordButton({ userId, email }: { userId: string, email: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setLoading(true);
    setError(null);
    setCopied(false);
    
    // Intercept server action
    const res = await resetStaffPassword(userId, email);
    
    if (res?.error) setError(res.error);
    
    if (res?.success && res.password) {
      setNewPassword(res.password);
    }
    
    setLoading(false);
  }

  const handleCopy = () => {
    if (!newPassword) return;
    const text = `Email: ${email}\nNew Password: ${newPassword}\n\nPlease log in and change this immediately.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setNewPassword(null);
      setError(null);
    }, 300);
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        variant="outline" 
        size="sm" 
        className="h-8 px-3 text-xs bg-white text-orange-600 border-orange-200 hover:bg-orange-50 transition-colors shadow-sm"
      >
        <KeyRound size={14} className="mr-1.5" /> Reset Password
      </Button>

      {/* THE SECURE OVERLAY MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="p-6 text-left whitespace-normal">
              {!newPassword ? (
                // STATE 1: CONFIRMATION
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-neutral-900">Force Password Reset?</h3>
                    <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                      This will immediately revoke access for <br/>
                      <strong className="text-neutral-900">{email}</strong><br/> 
                      and generate a new temporary password.
                    </p>
                  </div>
                  
                  {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-md border border-red-100 text-center">{error}</p>}

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
                    <Button 
                      type="button" 
                      onClick={handleReset} 
                      disabled={loading} 
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    >
                      {loading ? "Resetting..." : "Confirm Reset"}
                    </Button>
                  </div>
                </div>
              ) : (
                // STATE 2: SUCCESS UI LOCK
                <div className="space-y-5">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1 shadow-sm">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="font-bold text-emerald-900 text-lg">Reset Complete!</h3>
                    <p className="text-xs text-emerald-700 max-w-[250px]">Please securely share this new temporary password with the staff member.</p>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-md shadow-inner text-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block mb-2">New Password</span>
                    <span className="font-mono font-bold text-2xl tracking-widest text-neutral-900 block bg-white border border-neutral-200 px-3 py-2 rounded shadow-sm">
                      {newPassword}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      type="button" 
                      onClick={handleCopy} 
                      className={`w-full flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white'}`}
                    >
                      {copied ? <><CheckCircle2 size={16} /> Copied!</> : <><Copy size={16} /> Copy New Password</>}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleClose} className="w-full text-neutral-600">
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}