// FILE: src/components/settings/ApiKeyManager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Key, Copy, CheckCircle2, Eye, EyeOff, AlertTriangle, Hexagon } from 'lucide-react';
import { getTenantApiKeyAction } from '@/app/(dashboard)/settings/settings.actions'; // Adjust import path if needed

export default function ApiKeyManager() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadKey() {
      const res = await getTenantApiKeyAction();
      if (res.success) {
        setApiKey(res.apiKey);
        setBusinessId(res.businessId);
      } else {
        setError(res.error || 'Failed to load API settings');
      }
      setIsLoading(false);
    }
    loadKey();
  }, []);

  const handleCopy = (text: string, type: 'key' | 'id') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (isLoading) {
    return <div className="p-6 bg-white rounded-2xl border border-neutral-200 animate-pulse h-40"></div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 flex items-center gap-3">
        <AlertTriangle size={20} />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-6 bg-neutral-50/50 border-b border-neutral-200 flex items-start gap-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm">
          <Hexagon size={24} />
        </div>
        <div>
          <h2 className="text-base font-bold text-neutral-900">Developer API & Integrations</h2>
          <p className="text-sm text-neutral-500 mt-1 max-w-xl">
            Use these credentials to connect external storefronts (like your CRM Monorepo) or custom n8n workflows directly to this Macrobiz workspace.
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Business ID Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 block">Workspace / Business ID</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-neutral-100 border border-neutral-200 text-neutral-800 text-sm px-4 py-2.5 rounded-lg select-all font-mono">
              {businessId}
            </code>
            <button 
              onClick={() => handleCopy(businessId || '', 'id')}
              className="px-4 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors w-28 justify-center shrink-0"
            >
              {copiedId ? <><CheckCircle2 size={16} className="text-emerald-600"/> Copied</> : <><Copy size={16}/> Copy ID</>}
            </button>
          </div>
        </div>

        {/* Secret API Key Box */}
        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <label className="text-xs font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
            <Key size={14} className="text-indigo-500" /> Secret API Key
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <code className="block w-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-sm pl-4 pr-12 py-2.5 rounded-lg font-mono tracking-tight">
                {showKey ? apiKey : '••••••••-••••-••••-••••-••••••••••••'}
              </code>
              <button 
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-1"
                title={showKey ? "Hide Key" : "Reveal Key"}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            <button 
              onClick={() => handleCopy(apiKey || '', 'key')}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors w-28 justify-center shrink-0"
            >
              {copiedKey ? <><CheckCircle2 size={16} className="text-emerald-400"/> Copied</> : <><Copy size={16}/> Copy Key</>}
            </button>
          </div>
          <p className="text-[11px] font-medium text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded border border-amber-200 mt-1">
            Keep this key secret. Anyone with this key can create invoices in your ledger.
          </p>
        </div>

      </div>
    </div>
  );
}