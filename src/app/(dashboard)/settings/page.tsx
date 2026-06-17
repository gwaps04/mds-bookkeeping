// src/app/(dashboard)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import { updateTaxSettings } from "@/features/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Get Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id, role")
    .eq("id", user?.id)
    .single();

  // Kick out anyone who isn't the owner or super admin
  if (profile?.role !== 'business_owner' && profile?.role !== 'super_admin') {
    redirect("/dashboard");
  }

  // 2. Fetch Current Business Settings
  const { data: business } = await supabase
    .from("businesses")
    .select("is_tax_registered, tax_id")
    .eq("id", profile?.business_id)
    .single();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Business Settings</h2>
        <p className="text-neutral-500 mt-1">Manage your company configurations and compliance features.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        
        {/* COMPLIANCE & TAX SETTINGS CARD */}
        <Card className="shadow-sm border-neutral-200">
          <CardHeader>
            <CardTitle className="text-lg">Localized Tax Compliance</CardTitle>
            <CardDescription>Configure features specific to Philippine BIR regulations.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={async (formData) => {
              "use server";
              await updateTaxSettings(formData);
            }} className="space-y-6">
              
              {/* THE INTERACTIVE TOGGLE */}
              <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="checkbox"
                  id="is_tax_registered"
                  name="is_tax_registered"
                  defaultChecked={business?.is_tax_registered}
                  className="mt-1 h-5 w-5 accent-blue-600 rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-neutral-900">Enable BIR Tax Tracking</span>
                  <span className="text-sm text-neutral-500 mt-0.5">Activate localized tax features to track percentage taxes and income tax filings. Best for VAT and Non-VAT registered businesses.</span>
                </div>
              </label>

              {/* TIN INPUT */}
              <div className="space-y-2 p-4 bg-neutral-50 border border-neutral-100 rounded-lg">
                <Label htmlFor="tax_id" className="text-neutral-700">Tax Identification Number (TIN)</Label>
                <Input 
                  id="tax_id" 
                  name="tax_id" 
                  defaultValue={business?.tax_id || ""}
                  placeholder="e.g. 123-456-789-000" 
                  className="bg-white"
                />
                <p className="text-xs text-neutral-500">Leave blank if you are not enabling tax tracking.</p>
              </div>

              <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white">
                Save Settings
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}