// src/app/(dashboard)/team/TeamForms.tsx
"use client";

import { useState } from "react";
import { provisionStaffAccount, resetStaffPassword, updateStaffPermissions } from "@/features/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, CheckCircle2, KeyRound, AlertTriangle, ShieldCheck, Calculator, Package, Wallet, Users, Settings2, X, Landmark, Lock, Info } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";

// ============================================================================
// 1. PROVISION STAFF FORM 
// ============================================================================
// THE FIX: Explicitly declared the isTrial prop in the TypeScript Interface
export function ProvisionStaffForm({ 
  hasInventory, 
  hasPayroll, 
  hasTaxes, 
  isTrial 
}: { 
  hasInventory: boolean;
  hasPayroll: boolean; 
  hasTaxes: boolean; 
  isTrial: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string, pass: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isInventoryLocked = isTrial || !hasInventory;
  const isPayrollLocked = isTrial || !hasPayroll;
  const isTaxesLocked = !hasTaxes;

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
            <span className="font-mono font-bold text-lg tracking-widest text-neutral-900 block bg-neutral-50 px-3 py-1.5 rounded border border-neutral-200">
              {credentials.pass}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button type="button" onClick={handleCopy} className={`w-full flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white'}`}>
            {copied ? <><CheckCircle2 size={16} /> Copied!</> : <><Copy size={16} /> Copy Credentials</>}
          </Button>
          <Button onClick={() => setCredentials(null)} variant="outline" className="w-full border-neutral-200 text-neutral-600 hover:bg-neutral-50">
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Employee Full Name</Label>
          <Input id="name" name="name" placeholder="e.g. Maria Santos" required disabled={loading} className="focus-visible:ring-blue-600 font-medium" />
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Email Address</Label>
          <Input id="email" name="email" type="email" placeholder="employee@company.com" required disabled={loading} className="focus-visible:ring-blue-600 font-medium" />
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-neutral-100">
        <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          Module Access Control
        </Label>
        
        {isTrial ? (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-2.5 text-indigo-800 shadow-sm">
            <Info size={16} className="shrink-0 mt-0.5 text-indigo-600" />
            <p className="text-[10px] sm:text-[11px] leading-relaxed">
              <strong>Trial Status Notice:</strong> HR & Payroll and Inventory are Premium modules accessible only on Paid Subscriptions. They will not work while the workspace is in Trial mode.
            </p>
          </div>
        ) : (!hasInventory || !hasPayroll) ? (
          <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg flex items-start gap-2 text-neutral-500 shadow-sm">
            <Lock size={14} className="shrink-0 mt-0.5 text-neutral-400" />
            <p className="text-[10px] sm:text-[11px] leading-relaxed">
              Some Premium modules are disabled for your business. Upgrade your plan to grant staff access to them.
            </p>
          </div>
        ) : null}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg opacity-80 select-none">
            <input type="checkbox" checked disabled className="w-4 h-4 text-blue-600 rounded border-neutral-300" />
            <div className="flex flex-col">
              <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5"><Calculator size={14} className="text-neutral-500" /> Invoicing & Cash</span>
            </div>
          </div>

          <Label className={`flex items-center gap-3 p-3 border rounded-lg transition-colors shadow-sm ${!isInventoryLocked ? 'border-neutral-200 cursor-pointer hover:bg-blue-50/50 bg-white' : 'border-neutral-200 bg-neutral-50 opacity-60 grayscale cursor-not-allowed'}`}>
            <input type="checkbox" name="can_access_inventory" defaultChecked={false} disabled={isInventoryLocked} className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500 disabled:opacity-50" />
            <div className="flex flex-col">
              <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5"><Package size={14} className={!isInventoryLocked ? "text-amber-600" : "text-neutral-500"} /> Inventory</span>
            </div>
          </Label>

          <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-blue-50/50 transition-colors bg-white shadow-sm">
            <input type="checkbox" name="can_access_expenses" defaultChecked={false} className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500" />
            <div className="flex flex-col">
              <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5"><Wallet size={14} className="text-rose-600" /> Expenses</span>
            </div>
          </Label>

          <Label className={`flex items-center gap-3 p-3 border rounded-lg transition-colors shadow-sm ${!isTaxesLocked ? 'border-indigo-200 cursor-pointer hover:bg-indigo-50/50 bg-white' : 'border-neutral-200 bg-neutral-50 opacity-60 grayscale cursor-not-allowed'}`}>
            <input type="checkbox" name="can_access_taxes" disabled={isTaxesLocked} className="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 disabled:opacity-50" />
            <div className="flex flex-col">
              <span className="font-bold text-indigo-900 text-sm flex items-center gap-1.5"><Landmark size={14} className={!isTaxesLocked ? "text-indigo-600" : "text-neutral-500"} /> BIR Taxes</span>
            </div>
          </Label>

          <Label className={`flex items-center gap-3 p-3 border rounded-lg transition-colors shadow-sm sm:col-span-2 ${!isPayrollLocked ? 'border-red-200 cursor-pointer hover:bg-red-50/50 bg-white' : 'border-neutral-200 bg-neutral-50 opacity-60 grayscale cursor-not-allowed'}`}>
            <input type="checkbox" name="can_access_payroll" disabled={isPayrollLocked} className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500 disabled:opacity-50" />
            <div className="flex flex-col">
              <span className="font-bold text-red-900 text-sm flex items-center gap-1.5"><Users size={14} className={!isPayrollLocked ? "text-red-600" : "text-neutral-500"} /> HR & Payroll</span>
            </div>
          </Label>

        </div>
      </div>
      
      <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-100 leading-relaxed flex items-start gap-2">
        <ShieldCheck size={16} className="shrink-0 mt-0.5 text-blue-600" />
        <p>A highly secure, randomized password will be generated automatically. You will be able to copy it on the next screen.</p>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={loading} className="w-full bg-blue-700 text-white hover:bg-blue-800 font-bold transition-all shadow-sm h-11 md:h-10">
          {loading ? "Provisioning..." : "Provision Account & Permissions"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// 2. RESET PASSWORD BUTTON 
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
    
    const res = await resetStaffPassword(userId, email);
    
    if (res?.error) setError(res.error);
    if (res?.success && res.password) setNewPassword(res.password);
    
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
    setTimeout(() => { setNewPassword(null); setError(null); }, 300);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-orange-600 border-orange-200 hover:bg-orange-50 transition-colors shadow-sm">
        <KeyRound size={14} className="mr-1.5" /> Reset Password
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 text-left whitespace-normal">
              {!newPassword ? (
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2 mx-auto"><AlertTriangle size={24} /></div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-neutral-900">Force Password Reset?</h3>
                    <p className="text-sm text-neutral-500 mt-2 leading-relaxed">This will immediately revoke access for <br/><strong className="text-neutral-900">{email}</strong><br/> and generate a new temporary password.</p>
                  </div>
                  {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-md border border-red-100 text-center">{error}</p>}
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
                    <Button type="button" onClick={handleReset} disabled={loading} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold">{loading ? "Resetting..." : "Confirm Reset"}</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-1 shadow-sm"><CheckCircle2 size={24} /></div>
                    <h3 className="font-bold text-emerald-900 text-lg">Reset Complete!</h3>
                    <p className="text-xs text-emerald-700 max-w-[250px]">Please securely share this new temporary password with the staff member.</p>
                  </div>
                  <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-md shadow-inner text-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block mb-2">New Password</span>
                    <span className="font-mono font-bold text-2xl tracking-widest text-neutral-900 block bg-white border border-neutral-200 px-3 py-2 rounded shadow-sm">{newPassword}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button type="button" onClick={handleCopy} className={`w-full flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white'}`}>
                      {copied ? <><CheckCircle2 size={16} /> Copied!</> : <><Copy size={16} /> Copy New Password</>}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleClose} className="w-full text-neutral-600">Done</Button>
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

// ============================================================================
// 3. EDIT PERMISSIONS BUTTON
// ============================================================================
// THE FIX: Explicitly declared the isTrial prop in the TypeScript Interface
export function EditPermissionsButton({ 
  staff, 
  hasInventory, 
  hasPayroll, 
  hasTaxes, 
  isTrial
}: { 
  staff: { id: string, full_name: string, email: string, can_access_inventory: boolean, can_access_expenses: boolean, can_access_taxes: boolean, can_access_payroll: boolean };
  hasInventory: boolean; 
  hasPayroll: boolean; 
  hasTaxes: boolean; 
  isTrial: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInventoryLocked = isTrial || !hasInventory;
  const isPayrollLocked = isTrial || !hasPayroll;
  const isTaxesLocked = !hasTaxes;

  async function handleUpdate(formData: FormData) {
    setError(null);
    const res = await updateStaffPermissions(formData);
    
    if (res?.error) {
      setError(res.error);
    } else {
      setIsOpen(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors shadow-sm">
        <Settings2 size={14} className="mr-1.5" /> Edit Access
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="flex justify-between items-center p-5 border-b border-neutral-100 bg-neutral-50/50">
              <div className="min-w-0 pr-4">
                <h3 className="font-bold text-lg text-neutral-900 leading-tight">Edit Permissions</h3>
                <p className="text-xs text-neutral-500 font-medium mt-0.5 truncate">{staff.full_name || staff.email}</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200 rounded-md transition-colors shrink-0">
                <X size={20}/>
              </button>
            </div>

            <form action={handleUpdate} className="p-6 space-y-5 text-left">
              <input type="hidden" name="user_id" value={staff.id} />

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">Module Access Control</Label>
                
                {isTrial ? (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-2.5 text-indigo-800 shadow-sm">
                    <Info size={16} className="shrink-0 mt-0.5 text-indigo-600" />
                    <p className="text-[10px] sm:text-[11px] leading-relaxed">
                      <strong>Trial Status Notice:</strong> HR & Payroll and Inventory are Premium modules accessible only on Paid Subscriptions. They will not work while the workspace is in Trial mode.
                    </p>
                  </div>
                ) : (!hasInventory || !hasPayroll) ? (
                  <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg flex items-start gap-2 text-neutral-500 shadow-sm">
                    <Lock size={14} className="shrink-0 mt-0.5 text-neutral-400" />
                    <p className="text-[10px] sm:text-[11px] leading-relaxed">
                      Some Premium modules are disabled for your business. Upgrade your plan to grant staff access to them.
                    </p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg opacity-80 select-none">
                    <input type="checkbox" checked disabled className="w-4 h-4 text-blue-600 rounded border-neutral-300" />
                    <div className="flex flex-col">
                      <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5"><Calculator size={14} className="text-neutral-500" /> Invoicing & Cash</span>
                    </div>
                  </div>

                  <Label className={`flex items-center gap-3 p-3 border rounded-lg transition-colors shadow-sm ${!isInventoryLocked ? 'border-neutral-200 cursor-pointer hover:bg-blue-50/50 bg-white' : 'border-neutral-200 bg-neutral-50 opacity-60 grayscale cursor-not-allowed'}`}>
                    <input type="checkbox" name="can_access_inventory" defaultChecked={staff.can_access_inventory} disabled={isInventoryLocked} className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500 disabled:opacity-50" />
                    <div className="flex flex-col">
                      <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5"><Package size={14} className={!isInventoryLocked ? "text-amber-600" : "text-neutral-500"} /> Inventory</span>
                    </div>
                  </Label>

                  <Label className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-blue-50/50 transition-colors bg-white shadow-sm">
                    <input type="checkbox" name="can_access_expenses" defaultChecked={staff.can_access_expenses} className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500" />
                    <div className="flex flex-col">
                      <span className="font-bold text-neutral-900 text-sm flex items-center gap-1.5"><Wallet size={14} className="text-rose-600" /> Expenses</span>
                    </div>
                  </Label>

                  <Label className={`flex items-center gap-3 p-3 border rounded-lg transition-colors shadow-sm ${!isTaxesLocked ? 'border-indigo-200 cursor-pointer hover:bg-indigo-50/50 bg-white' : 'border-neutral-200 bg-neutral-50 opacity-60 grayscale cursor-not-allowed'}`}>
                    <input type="checkbox" name="can_access_taxes" defaultChecked={staff.can_access_taxes} disabled={isTaxesLocked} className="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 disabled:opacity-50" />
                    <div className="flex flex-col">
                      <span className="font-bold text-indigo-900 text-sm flex items-center gap-1.5"><Landmark size={14} className={!isTaxesLocked ? "text-indigo-600" : "text-neutral-500"} /> BIR Taxes</span>
                    </div>
                  </Label>

                  <Label className={`flex items-center gap-3 p-3 border rounded-lg transition-colors shadow-sm sm:col-span-2 ${!isPayrollLocked ? 'border-red-200 cursor-pointer hover:bg-red-50/50 bg-white' : 'border-neutral-200 bg-neutral-50 opacity-60 grayscale cursor-not-allowed'}`}>
                    <input type="checkbox" name="can_access_payroll" defaultChecked={staff.can_access_payroll} disabled={isPayrollLocked} className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500 disabled:opacity-50" />
                    <div className="flex flex-col">
                      <span className="font-bold text-red-900 text-sm flex items-center gap-1.5"><Users size={14} className={!isPayrollLocked ? "text-red-600" : "text-neutral-500"} /> HR & Payroll</span>
                    </div>
                  </Label>

                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" className="flex-1 font-bold border-neutral-200 text-neutral-600" onClick={() => setIsOpen(false)}>Cancel</Button>
                <SubmitButton title="Save Updates" loadingTitle="Saving..." className="flex-[2] bg-blue-700 hover:bg-blue-800 text-white font-bold" />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}