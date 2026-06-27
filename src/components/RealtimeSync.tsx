// src/components/RealtimeSync.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Define the structure of our Live Notifications
type LiveNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  time: Date;
  read: boolean;
};

export default function RealtimeSync() {
  const router = useRouter();
  const supabase = createClient();
  
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // =========================================================================
  // PHASE 1: ROBUST IDENTITY RESOLUTION
  // =========================================================================
  useEffect(() => {
    let isMounted = true;
    
    async function resolveTenantIdentity() {
      console.log("🔍 [Realtime Sync] Phase 1: Checking user identity...");
      
      // Use getUser() instead of getSession() to guarantee we check the server state
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("❌ [Realtime Sync] No active user found. Cannot sync.", authError);
        return;
      }
      
      console.log(`✅ [Realtime Sync] User found: ${user.email}`);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("❌ [Realtime Sync] Failed to load user profile or business_id.", profileError);
        return;
      }
      
      console.log(`✅ [Realtime Sync] Profile matched to Business ID: ${profile.business_id}`);

      if (isMounted && profile.business_id) {
        setBusinessId(profile.business_id);
        setUserRole(profile.role);
      }
    }
    
    resolveTenantIdentity();
    return () => { isMounted = false; };
  }, [supabase]);

  // =========================================================================
  // PHASE 2: TENANT-PARTITIONED WEBSOCKET TUNNEL
  // =========================================================================
  useEffect(() => {
    if (!businessId) {
      console.log("⏳ [Realtime Sync] Waiting for Business ID to be set...");
      return;
    }

    console.log(`🔌 [Realtime Sync] Phase 2: Attempting connection to tenant ${businessId}...`);
    const channelName = `enterprise-sync-tenant-${businessId}`;

    const handleDatabaseChange = (payload: any) => {
      console.log(`📡 [Realtime Sync] Database Payload Received!`, payload);
      
      const newRecord = payload.new;
      const eventType = payload.eventType; 
      
      let title = "System Update";
      let description = "A change occurred in the ledger.";
      let href = "/dashboard"; 

      if (payload.table === 'invoices') {
        title = eventType === 'INSERT' ? "New Invoice Created" : "Invoice Updated";
        description = newRecord.client_name ? `Client: ${newRecord.client_name}` : `Invoice #${newRecord.id.split('-')[0].toUpperCase()}`;
        href = `/invoices/${newRecord.id}`;
      } 
      else if (payload.table === 'income') {
        title = "Payment Received";
        description = `Amount: ₱${Number(newRecord.amount).toLocaleString('en-US')} logged.`;
        href = newRecord.invoice_id ? `/invoices/${newRecord.invoice_id}` : `/dashboard`;
      } 
      else if (payload.table === 'expenses') {
        title = "Expense Disbursed";
        description = `Amount: ₱${Number(newRecord.amount).toLocaleString('en-US')} logged.`;
        href = `/dashboard`;
      } 
      else if (payload.table === 'refund_requests') {
        if (newRecord.status === 'pending') {
          title = "Refund Requested";
          description = `A ₱${Number(newRecord.amount).toLocaleString('en-US')} refund awaits approval.`;
          href = userRole === 'business_owner' || userRole === 'super_admin' ? `/dashboard` : `/invoices/${newRecord.invoice_id}`;
        } else if (newRecord.status === 'approved') {
          title = "Refund Approved";
          description = `₱${Number(newRecord.amount).toLocaleString('en-US')} was deducted from cash.`;
          href = `/invoices/${newRecord.invoice_id}`;
        }
      } 
      else if (payload.table === 'businesses') {
        title = "Settings Updated";
        description = "Business configurations were modified.";
        href = `/settings`;
      }

      const newNotification: LiveNotification = {
        id: Math.random().toString(36).substr(2, 9),
        title,
        description,
        href,
        time: new Date(),
        read: false
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setIsOpen(true); 
    };

    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `business_id=eq.${businessId}` }, handleDatabaseChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income', filter: `business_id=eq.${businessId}` }, handleDatabaseChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `business_id=eq.${businessId}` }, handleDatabaseChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_requests', filter: `business_id=eq.${businessId}` }, handleDatabaseChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'businesses', filter: `id=eq.${businessId}` }, handleDatabaseChange)
      .subscribe((status, error) => {
        console.log(`📡 [Realtime Sync] Websocket Status:`, status);
        if (error) console.error(`❌ [Realtime Sync] Socket Error:`, error);
        
        if (status === 'SUBSCRIBED') {
          console.log(`🟢 [Realtime Sync] Connected to Tenant Engine: ${businessId}`);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [businessId, userRole, supabase]);

  // =========================================================================
  // PHASE 3: ACTION HANDLERS
  // =========================================================================
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notif: LiveNotification) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setIsOpen(false);
    
    startTransition(() => {
      router.push(notif.href);
      router.refresh();
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // =========================================================================
  // PHASE 4: THE FLOATING UI
  // =========================================================================
  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end print:hidden">
      
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-neutral-900 text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold text-sm tracking-wide">Live Activity</h3>
            <div className="flex gap-3">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[10px] uppercase tracking-wider text-neutral-400 hover:text-white transition-colors">
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto divide-y divide-neutral-100 bg-neutral-50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">
                <p>No recent activity in this session.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left p-4 hover:bg-neutral-100 transition-colors flex gap-4 ${!notif.read ? 'bg-white' : 'opacity-75'}`}
                >
                  <div className="mt-1 flex-shrink-0">
                    {!notif.read ? (
                      <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                    ) : (
                      <div className="h-2 w-2 bg-neutral-300 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${!notif.read ? 'text-neutral-900' : 'text-neutral-600'}`}>{notif.title}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{notif.description}</p>
                    <p className="text-[10px] text-neutral-400 mt-2 font-mono">{notif.time.toLocaleTimeString()}</p>
                  </div>
                  <div className="flex-shrink-0 self-center text-neutral-400">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-xl hover:bg-neutral-800 hover:scale-105 active:scale-95 transition-all border border-neutral-700 focus:outline-none"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 border-2 border-white text-[11px] font-bold text-white shadow-sm animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </button>

    </div>
  );
}