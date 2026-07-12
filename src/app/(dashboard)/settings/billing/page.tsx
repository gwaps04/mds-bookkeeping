// src/app/(dashboard)/settings/billing/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, AlertTriangle, Zap, ShieldCheck, Download } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user?.id)
    .single();

  const { data: business } = await supabase
    .from("businesses")
    .select("subscription_status, subscription_tier, trial_ends_at, business_name")
    .eq("id", profile?.business_id)
    .single();

  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';
  const status = business?.subscription_status || 'trial';
  const tier = business?.subscription_tier || 'essential';
  
  const trialEndDate = business?.trial_ends_at ? new Date(business.trial_ends_at) : null;
  const isTrialExpired = trialEndDate ? trialEndDate < new Date() : false;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0 overflow-x-hidden pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full min-w-0">
        <div className="w-full min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 text-balance leading-tight">Billing & Subscriptions</h2>
          <p className="text-sm sm:text-base text-neutral-500 mt-1">Manage your plan, billing history, and payment methods for {business?.business_name}.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-3 items-start w-full min-w-0">
        
        {/* LEFT COLUMN: CURRENT PLAN STATUS */}
        <div className="lg:col-span-1 space-y-6 w-full min-w-0">
          <Card className="shadow-sm border-neutral-200 bg-white overflow-hidden w-full min-w-0">
            <div className={`h-2 w-full ${status === 'active' ? 'bg-emerald-500' : isTrialExpired ? 'bg-red-500' : 'bg-amber-500'}`} />
            
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <ShieldCheck size={20} className="text-neutral-500" /> Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Active Tier</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black text-neutral-900 capitalize">{tier} Plan</h3>
                  {status === 'active' && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Active</span>}
                  {status === 'trial' && !isTrialExpired && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Trial</span>}
                  {isTrialExpired && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wider">Expired</span>}
                </div>
              </div>

              {status === 'trial' && trialEndDate && (
                <div className={`p-3 rounded-md text-sm shadow-sm border ${isTrialExpired ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{isTrialExpired ? 'Your trial has expired.' : 'You are currently on a free trial.'}</p>
                      <p className="text-xs mt-0.5 opacity-90">
                        {isTrialExpired 
                          ? 'Upgrade now to restore write access to your ledger.' 
                          : `Your trial ends on ${trialEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isOwner ? (
                <Button className="w-full bg-neutral-900 text-white hover:bg-neutral-800 font-bold shadow-sm h-11 sm:h-10">
                  Manage Subscription
                </Button>
              ) : (
                <div className="p-3 bg-neutral-50 rounded-md text-xs text-neutral-500 text-center border border-neutral-200">
                  Only Business Owners can modify billing settings.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-neutral-200 bg-white w-full min-w-0">
            <CardHeader className="pb-4 border-b border-neutral-100">
              <CardTitle className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <CreditCard size={16} className="text-neutral-500" /> Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <p className="text-sm text-neutral-500 text-center py-4">Manual payment verification active.</p>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: UPGRADE & FEATURES */}
        <div className="lg:col-span-2 w-full min-w-0 space-y-6">
          <Card className="shadow-sm border-indigo-200 bg-indigo-50/30 w-full min-w-0 overflow-hidden relative">
            
            <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-900 pointer-events-none transform translate-x-4 -translate-y-4">
              <Zap size={120} />
            </div>

            <CardHeader>
              <CardTitle className="text-xl font-bold text-indigo-950">Upgrade to MacroBiz Essential</CardTitle>
              <CardDescription className="text-indigo-700/80">Unlock your business ledger and other features.</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="grid xl:grid-cols-5 gap-6 xl:gap-8 relative z-10 w-full min-w-0">
                
                {/* PRICING & INSTRUCTIONS BLOCK */}
                <div className="xl:col-span-3 space-y-6 w-full min-w-0">
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-black text-indigo-950">₱5,000</span>
                      <span className="text-sm font-bold text-indigo-700/80">/ Year</span>
                    </div>
                    <p className="text-xs font-bold text-indigo-700/70">₱416.67/month (billed annually)</p>
                  </div>
                  
                  <p className="text-sm text-indigo-900/80 leading-relaxed max-w-md">
                    Perfect for growing MSMEs needing complete control over payroll, inventory, and automated tax reporting.
                  </p>

                  {/* THE PAYMENT INSTRUCTIONS COMPONENT */}
                  <div className="bg-white/60 border border-indigo-200/60 p-4 sm:p-5 rounded-xl shadow-sm flex flex-col sm:flex-row gap-5 items-center sm:items-start w-full min-w-0">
                    
                    {/* THE FIX: Enlarge QR Code, Wrap in <a> tag with download attribute, and handle flex wrapping */}
                    <div className="shrink-0 flex flex-col items-center gap-2">
                      <a 
                        href="/qr-code.jpg" 
                        download="macrobiz-payment-qr.jpg"
                        title="Download MacroBiz Payment QR"
                        className="block bg-white p-2.5 rounded-xl shadow-sm border border-indigo-100 transition-transform hover:scale-105 active:scale-95 group relative overflow-hidden"
                      >
                        <Image 
                          src="/qr-code.jpg" 
                          alt="MacroBiz Payment QR Code" 
                          width={160} 
                          height={160} 
                          className="rounded-lg object-contain"
                          priority
                        />
                        {/* Hover Overlay for Desktop */}
                        <div className="absolute inset-0 bg-indigo-900/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                           <Download className="text-indigo-700 drop-shadow-md w-8 h-8" />
                        </div>
                      </a>
                      <a 
                        href="/qr-code.jpg" 
                        download="macrobiz-payment-qr.jpg"
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-wider hover:text-indigo-800 transition-colors flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-indigo-50"
                      >
                        <Download size={12} /> Download QR
                      </a>
                    </div>
                    
                    <div className="space-y-2.5 w-full min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 text-center sm:text-left">How to Upgrade:</p>
                      <ol className="list-decimal list-outside ml-4 text-xs sm:text-sm text-indigo-950 space-y-2.5 marker:font-bold marker:text-indigo-600">
                        <li><strong className="text-indigo-700">Save or Scan</strong> the QR code to transfer exactly <span className="font-bold underline decoration-indigo-300 underline-offset-2">₱5,000</span>.</li>
                        <li>Click <strong className="text-indigo-700">Upgrade Now</strong> below to open the verification form.</li>
                        <li>Upload the <strong className="text-indigo-700">screenshot of your transfer</strong>.</li>
                        <li>Ensure you input the exact <strong className="text-indigo-700">email & phone number</strong> used in your MacroBiz account so we can activate your ledger.</li>
                      </ol>
                    </div>
                  </div>

                  {/* EXTERNAL LINK BUTTON */}
                  {isOwner && (
                    <Button asChild className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm h-12 sm:h-11 px-8 transition-all text-base">
                      <a 
                        href="https://docs.google.com/forms/d/e/1FAIpQLScHHDEi1raR-QVPc0T4j4Zr_uryC-YrVhz5lWZWrskd4sY1LQ/viewform?usp=dialog" 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        Upgrade Now
                      </a>
                    </Button>
                  )}
                </div>

                {/* FEATURES LIST BLOCK */}
                <div className="xl:col-span-2 space-y-4 xl:border-l border-indigo-200/50 xl:pl-6 pt-4 xl:pt-0 border-t xl:border-t-0 mt-2 xl:mt-0 w-full min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Advance Business Features</p>
                  <ul className="space-y-3">
                    {['Unlimited Chart of Accounts', 'Advanced Payroll Run Automation', 'Inventory Stock Movements & Recipes', 'Receipt Uploads & Document Storage', 'Multi-Staff Role Management'].map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-indigo-950 font-medium">
                        <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                        <span className="leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}