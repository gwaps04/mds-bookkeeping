// src/lib/subscription.ts
import { createClient } from "@/lib/supabase/server";

export type SubscriptionTier = 'essential' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'canceled';

// ============================================================================
// 1. HARDCODED TIER LIMITS
// ============================================================================
export const TIER_LIMITS = {
  essential: {
    max_staff: 3,
    max_organizations: 3,
    features: {
      chart_of_accounts: true,
      audit_trail: true,
      invoices: true,
      income_sales: true,
      expenses: true,
      bir_tax_tracker: true,
    }
  },
  pro: {
    max_staff: 10,
    max_organizations: 5,
    features: {
      chart_of_accounts: true,
      audit_trail: true,
      invoices: true,
      income_sales: true,
      expenses: true,
      bir_tax_tracker: true,
    }
  },
  enterprise: {
    max_staff: 9999, // Unlimited
    max_organizations: 9999,
    features: {
      chart_of_accounts: true,
      audit_trail: true,
      invoices: true,
      income_sales: true,
      expenses: true,
      bir_tax_tracker: true,
    }
  }
};

// ============================================================================
// 2. THE SOFT-LOCKOUT CALCULATOR
// ============================================================================
export interface TenantAccessState {
  isLocked: boolean;         // If true, gray out mutation buttons!
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  daysLeftInTrial: number;   // Used for the "X Days Left" banner
  message: string;           // Reason for lock (e.g. "Trial Expired", "Past Due")
}

/**
 * Evaluates the raw database row of a business to determine its exact commercial access rights.
 */
export function getTenantAccessLevel(business: any): TenantAccessState {
  const status = (business?.subscription_status || 'trial') as SubscriptionStatus;
  const tier = (business?.subscription_tier || 'essential') as SubscriptionTier;
  
  const now = new Date();
  let isLocked = false;
  let daysLeftInTrial = 0;
  let message = "Active Subscription";

  switch (status) {
    case 'active':
      isLocked = false;
      break;

    case 'trial':
      if (!business.trial_ends_at) {
        // Super Admin hasn't set the trial period yet (Pending Approval)
        isLocked = true;
        message = "Account Pending Administrator Approval.";
      } else {
        const trialEnd = new Date(business.trial_ends_at);
        const diffTime = trialEnd.getTime() - now.getTime();
        daysLeftInTrial = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysLeftInTrial <= 0) {
          isLocked = true;
          daysLeftInTrial = 0;
          message = "Your 15-day trial has expired. Please subscribe to Macrobiz Essential to unlock your ledger.";
        } else {
          isLocked = false;
          message = `${daysLeftInTrial} days left in your free trial.`;
        }
      }
      break;

    case 'past_due':
      isLocked = true; // Or false, if you offer a 3-day grace period!
      message = "Your subscription payment is past due. Please update your billing information.";
      break;

    case 'suspended':
      isLocked = true;
      message = "This account has been administratively suspended. Please contact support.";
      break;

    case 'canceled':
      isLocked = true;
      message = "Your subscription has been canceled. Renew to restore full access.";
      break;
  }

  return {
    isLocked,
    status,
    tier,
    daysLeftInTrial,
    message
  };
}

// ============================================================================
// 3. CAP LIMIT CHECKERS (For API Routes)
// ============================================================================
export function canAddStaff(tier: SubscriptionTier, currentStaffCount: number): boolean {
  return currentStaffCount < TIER_LIMITS[tier].max_staff;
}

export function canAddOrganization(tier: SubscriptionTier, currentOrgCount: number): boolean {
  return currentOrgCount < TIER_LIMITS[tier].max_organizations;
}

// ============================================================================
// 4. API DEFENSE LAYER (The Global Server Guard)
// ============================================================================
/**
 * Injects a physical barrier into Server Actions. Throws an error if the user's tenant is locked.
 */
export async function verifyActiveSubscription(userId: string) {
  const supabase = await createClient();

  // 1. Find the user's active business
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile?.business_id) {
    throw new Error("SaaS Lockout: No active business tenant found.");
  }

  // 2. Super Admins bypass the billing lock
  if (profile.role === 'super_admin') return;

  // 3. Fetch the billing state
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("subscription_status, subscription_tier, trial_ends_at")
    .eq("id", profile.business_id)
    .single();

  if (bizError || !business) {
    throw new Error("SaaS Lockout: Could not verify tenant billing state.");
  }

  // 4. Evaluate the lock via our centralized engine
  const accessState = getTenantAccessLevel(business);

  // 5. THE PHYSICAL LOCKOUT
  if (accessState.isLocked) {
    throw new Error(`SaaS Lockout: ${accessState.message} Ledger is in read-only mode.`);
  }

  // If we reach here, the tenant is active and authorized!
}