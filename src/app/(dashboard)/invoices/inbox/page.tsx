// FILE: src/app/(dashboard)/invoices/inbox/page.tsx
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox, CheckCircle2, ArrowRight, Zap } from "lucide-react";
import { dismissInboxItemAction } from "./inbox.actions";
import SubmitButton from "@/components/SubmitButton";

export default async function CrmInboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) redirect("/dashboard");

  // Fetch Pending Deals
  const { data: inboxItems } = await supabase
    .from("crm_inbox")
    .select("*")
    .eq("business_id", profile.business_id)
    .eq("status", "PENDING")
    .order("created_at", { ascending: false });

  return (
    <React.Fragment>
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <Link href="/invoices" className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors bg-white px-3 py-1.5 rounded-md border border-neutral-200 shadow-sm shrink-0">
            &larr; Back to Invoices
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <Inbox className="text-blue-600" size={24} /> Integration Inbox
            </h2>
          </div>
        </div>

        {/* THE MACROTEK UPSELL BANNER */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden border border-neutral-950">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Zap size={120} />
          </div>
          <div className="relative z-10 max-w-3xl space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Zap className="text-amber-400" size={20} /> Macrotek Digital Solutions Integration
            </h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              This Smart Inbox securely catches incoming contracts, e-signatures, and automated deals. If you have an active CRM API integration, your incoming deals will automatically appear here for review before posting to your official ledger.
            </p>
            <div className="bg-neutral-950/50 border border-neutral-700 rounded-xl p-4 mt-4 inline-block">
              {/* WOZ FIX: Removed duplicate text color classes */}
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">Want to automate your workflow?</p>
              <p className="text-sm text-neutral-300">
                Contact Macrotek at <span className="font-bold text-white">0956 335 5850</span>, email <a href="mailto:info@macrotekdigitalsolutions.com" className="text-blue-400 hover:underline">info@macrotekdigitalsolutions.com</a>, or visit <a href="https://www.macrotekdigitalsolutions.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">www.macrotekdigitalsolutions.com</a> for full ERP & CRM integration services.
              </p>
            </div>
          </div>
        </div>

        {/* INBOX ITEMS LIST */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 ml-1">Pending Deals ({inboxItems?.length || 0})</h3>
          
          {!inboxItems || inboxItems.length === 0 ? (
            <div className="bg-white border border-neutral-200 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <CheckCircle2 size={48} className="text-neutral-300 mb-4" />
              <h4 className="text-lg font-bold text-neutral-900">Inbox Zero</h4>
              <p className="text-sm text-neutral-500 mt-1">You have no pending deals to process.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {inboxItems.map((item) => (
                <div key={item.id} className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  
                  {/* Deal Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-md">New Deal</span>
                      <span className="text-xs text-neutral-400 font-medium">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-lg font-bold text-neutral-900">{item.client_name}</h4>
                    <p className="text-sm text-neutral-600 font-medium">
                      {item.description} &bull; <span className="text-green-700 font-bold">₱{Number(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </p>
                    {(item.client_email || item.client_phone) && (
                      <p className="text-xs text-neutral-400 mt-1">
                        {item.client_email} {item.client_phone && `| ${item.client_phone}`}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    
                    {/* WOZ FIX: Converted bind to hidden input for TS Compliance */}
                    <form action={dismissInboxItemAction}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <SubmitButton 
                        title="Dismiss" 
                        loadingTitle="..." 
                        className="h-10 px-4 bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-red-600 font-semibold rounded-lg text-sm transition-colors shadow-sm"
                      />
                    </form>
                    
                    <Link
                      href={`/invoices/new?clientName=${encodeURIComponent(item.client_name)}&amount=${encodeURIComponent(item.amount.toString())}&desc=${encodeURIComponent(item.description)}`}
                      className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
                    >
                      Create Invoice <ArrowRight size={16} />
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </React.Fragment>
  );
}