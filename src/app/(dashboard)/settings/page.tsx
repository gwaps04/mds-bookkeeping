// src/app/(dashboard)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SubmitButton from "@/components/SubmitButton";
import { revalidatePath } from "next/cache";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, business_id, businesses(*)")
    .eq("id", user?.id)
    .single();

  const business = Array.isArray(profile?.businesses) ? profile.businesses[0] : profile?.businesses;

  async function saveSettings(formData: FormData) {
    "use server";
    const supabaseServer = await createClient();
    const bId = formData.get("business_id") as string;
    
    // Core Configuration
    const is_tax_registered = formData.get("is_tax_registered") === "on";
    const allow_staff_payment_logging = formData.get("allow_staff_payment_logging") === "on";
    const allow_staff_account_creation = formData.get("allow_staff_account_creation") === "on";
    const allow_staff_refund_request = formData.get("allow_staff_refund_request") === "on";
    const allow_staff_void_request = formData.get("allow_staff_void_request") === "on"; // <-- THE NEW TOGGLE
    const tin_number = formData.get("tin_number") as string;

    // Dashboard Visibility Configuration
    const show_net_cash_to_staff = formData.get("show_net_cash_to_staff") === "on";
    const show_taxes_to_staff = formData.get("show_taxes_to_staff") === "on";

    const { error } = await supabaseServer.from("businesses").update({
      is_tax_registered,
      tax_id: tin_number,
      allow_staff_payment_logging,
      allow_staff_account_creation,
      allow_staff_refund_request,
      allow_staff_void_request, // <-- SAVING TO DB
      show_net_cash_to_staff,
      show_taxes_to_staff
    }).eq("id", bId);

    if (error) {
      console.error("Supabase Save Error:", error);
      throw new Error("Failed to save settings: " + error.message);
    }

    revalidatePath("/", "layout");
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Business Settings</h2>
        <p className="text-neutral-500 mt-1">Manage your company configurations and compliance features.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <form action={saveSettings} className="space-y-6">
          <input type="hidden" name="business_id" value={business?.id || ''} />

          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="border-b border-neutral-100 pb-4 bg-neutral-50/50">
              <CardTitle className="text-lg">Dashboard Visibility Controls</CardTitle>
              <CardDescription>Control exactly which financial metrics your staff can see.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="p-4 bg-white border border-neutral-200 rounded-md flex items-start gap-3 hover:border-neutral-300 transition-colors">
                <input type="checkbox" id="show_net_cash_to_staff" name="show_net_cash_to_staff" defaultChecked={business?.show_net_cash_to_staff ?? true} className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer" />
                <div>
                  <Label htmlFor="show_net_cash_to_staff" className="font-semibold text-neutral-900 cursor-pointer">Show Net Cash Balance to Staff</Label>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">If disabled, the main cash balance metric will be completely hidden from all staff accounts.</p>
                </div>
              </div>
              <div className="p-4 bg-white border border-neutral-200 rounded-md flex items-start gap-3 hover:border-neutral-300 transition-colors">
                <input type="checkbox" id="show_taxes_to_staff" name="show_taxes_to_staff" defaultChecked={business?.show_taxes_to_staff ?? false} className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer" />
                <div>
                  <Label htmlFor="show_taxes_to_staff" className="font-semibold text-neutral-900 cursor-pointer">Show Total Taxes Paid to Staff</Label>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">If disabled, the orange Executive Tax metric card will be hidden from staff. Owners will always see it.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="border-b border-neutral-100 pb-4 bg-neutral-50/50">
              <CardTitle className="text-lg">System Configurations</CardTitle>
              <CardDescription>Configure features specific to your ledger operations.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              
              <div className="p-4 bg-white border border-neutral-200 rounded-md flex items-start gap-3 hover:border-neutral-300 transition-colors">
                <input type="checkbox" id="allow_staff_payment_logging" name="allow_staff_payment_logging" defaultChecked={business?.allow_staff_payment_logging ?? true} className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer" />
                <div>
                  <Label htmlFor="allow_staff_payment_logging" className="font-semibold text-neutral-900 cursor-pointer">Allow Staff to Log Payments</Label>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">If disabled, only Business Owners and Admins can log receipts against invoices.</p>
                </div>
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-md flex items-start gap-3 hover:border-neutral-300 transition-colors">
                <input type="checkbox" id="allow_staff_refund_request" name="allow_staff_refund_request" defaultChecked={business?.allow_staff_refund_request ?? true} className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer" />
                <div>
                  <Label htmlFor="allow_staff_refund_request" className="font-semibold text-neutral-900 cursor-pointer">Allow Staff to Request Refunds</Label>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">If disabled, only Business Owners can view the refund module and process overpayments.</p>
                </div>
              </div>

              {/* --- NEW MODULE: VOID REQUEST CONTROL --- */}
              <div className="p-4 bg-white border border-neutral-200 rounded-md flex items-start gap-3 hover:border-neutral-300 transition-colors">
                <input type="checkbox" id="allow_staff_void_request" name="allow_staff_void_request" defaultChecked={business?.allow_staff_void_request ?? true} className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer" />
                <div>
                  <Label htmlFor="allow_staff_void_request" className="font-semibold text-neutral-900 cursor-pointer">Allow Staff to Request Payment Voids</Label>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">If disabled, only Business Owners can void posted payments. Staff will only be able to edit amounts.</p>
                </div>
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-md flex items-start gap-3 hover:border-neutral-300 transition-colors">
                <input type="checkbox" id="allow_staff_account_creation" name="allow_staff_account_creation" defaultChecked={business?.allow_staff_account_creation ?? true} className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer" />
                <div>
                  <Label htmlFor="allow_staff_account_creation" className="font-semibold text-neutral-900 cursor-pointer">Allow Staff to Modify Chart of Accounts</Label>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">If disabled, only Business Owners and Admins can add new banks or ledger categories.</p>
                </div>
              </div>

              <div className="p-4 bg-white border border-neutral-200 rounded-md flex items-start gap-3 hover:border-neutral-300 transition-colors">
                <input type="checkbox" id="is_tax_registered" name="is_tax_registered" defaultChecked={business?.is_tax_registered} className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer" />
                <div>
                  <Label htmlFor="is_tax_registered" className="font-semibold text-neutral-900 cursor-pointer">Enable BIR Tax Tracking</Label>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">Activate localized tax features to track percentage taxes and income tax filings.</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="tin_number">Tax Identification Number (TIN)</Label>
                <Input id="tin_number" name="tin_number" placeholder="e.g. 123-456-789-000" defaultValue={business?.tax_id || ""} className="max-w-sm" />
                <p className="text-[10px] text-neutral-400">Leave blank if you are not enabling tax tracking.</p>
              </div>

            </CardContent>
          </Card>

          <SubmitButton title="Save Settings" loadingTitle="Saving..." className="w-full h-12 text-md font-semibold bg-neutral-900 text-white hover:bg-neutral-800 shadow-md" />
        </form>
      </div>
    </div>
  );
}