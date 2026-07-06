// src/components/SaaSLockoutBanner.tsx
import { createClient } from "@/lib/supabase/server";
import { getTenantAccessLevel } from "@/lib/subscription";
import { AlertTriangle, Info, Lock } from "lucide-react";
import Link from "next/link";

export async function SaaSLockoutBanner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch the user's active business billing state
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.business_id) return null;

  // We don't lock out Super Admins
  if (profile.role === 'super_admin') return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("subscription_status, subscription_tier, trial_ends_at")
    .eq("id", profile.business_id)
    .single();

  if (!business) return null;

  // 2. Run the state through our Central Billing Engine
  const accessState = getTenantAccessLevel(business);

  // 3. If fully active, render nothing (get out of the user's way)
  if (!accessState.isLocked && accessState.status === 'active') {
    return null;
  }

  // 4. Trial Warning (Not locked yet, but counting down)
  if (!accessState.isLocked && accessState.status === 'trial') {
    return (
      <div className="bg-blue-600 text-white px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-3 w-full shadow-sm relative z-50">
        <Info size={16} className="shrink-0" />
        <p>
          {accessState.message} Upgrade to <strong>Macrobiz {accessState.tier.toUpperCase()}</strong> to secure your ledger.
        </p>
        <Link href="/settings/billing" className="bg-white text-blue-700 hover:bg-blue-50 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ml-2 transition-colors">
          Upgrade Now
        </Link>
      </div>
    );
  }

  // 5. THE SOFT LOCKOUT (Expired, Suspended, Past Due, Canceled)
  return (
    <div className="bg-red-600 text-white px-4 py-3 text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-3 w-full shadow-md relative z-50">
      <div className="flex items-center gap-2">
        {accessState.status === 'suspended' ? <Lock size={18} /> : <AlertTriangle size={18} />}
        <span className="font-bold uppercase tracking-wider">Account Locked</span>
      </div>
      <p className="text-center sm:text-left">
        {accessState.message} Your ledger is currently in <strong>Read-Only Mode</strong>.
      </p>
      
      {/* If it's just a billing issue, give them an upgrade button. If suspended, tell them to contact support. */}
      {accessState.status !== 'suspended' ? (
        <Link href="/settings/billing" className="bg-white text-red-700 hover:bg-red-50 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider sm:ml-4 transition-colors shrink-0 shadow-sm">
          Resolve Billing
        </Link>
      ) : (
        <a href="mailto:support@macrobiz.com" className="bg-white text-red-700 hover:bg-red-50 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider sm:ml-4 transition-colors shrink-0 shadow-sm">
          Contact Support
        </a>
      )}
    </div>
  );
}