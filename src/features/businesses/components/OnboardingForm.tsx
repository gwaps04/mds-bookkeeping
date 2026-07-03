// src/features/businesses/components/OnboardingForm.tsx
"use client";

import { useState, useTransition } from "react";
import { provisionTenant } from "@/features/businesses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FEATURE_OPTIONS = [
  "Inventory Management", "Payroll & Employee Management", "Customer Relationship Management (CRM)",
  "Quotations & Estimates", "Purchase Orders & Procurement", "Financial Reports & Dashboards",
  "Tax Preparation & Compliance", "Business Analytics & Insights", "Point of Sale (POS)",
  "Appointment & Booking System", "Project Management", "Document Management",
  "Asset Management", "Multi-Branch Management", "E-commerce Integration",
  "Online Payment Integration", "AI Business Assistant", "Business Website & Online Presence",
  "Mobile App for My Business", "Other (Please specify)"
];

export function OnboardingForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  
  // Telemetry States
  const [industry, setIndustry] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature) 
        : [...prev, feature]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    // Client-Side Validation Guard for Telemetry
    if (!industry || !employeeCount) {
      setError("Please select your industry and team size to continue.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    // Inject our state variables into the form payload
    formData.set("industry", industry);
    formData.set("employee_count", employeeCount);
    formData.set("requested_features", JSON.stringify(selectedFeatures));

    startTransition(async () => {
      const result = await provisionTenant(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <Card className="w-full max-w-5xl shadow-2xl border-neutral-200 overflow-hidden bg-white animate-in zoom-in-95 duration-500">
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row">
        
        {/* LEFT COLUMN: CORE REGISTRATION (Dark Anchor) */}
        <div className="w-full lg:w-2/5 bg-neutral-900 p-8 md:p-12 text-white flex flex-col justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Establish Your Ledger</h1>
            <p className="text-neutral-400 text-sm leading-relaxed mb-10">
              Provision your business tenant. You can update tax configurations later in your dashboard.
            </p>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="business_name" className="text-neutral-300">Registered Business Name</Label>
                <Input 
                  id="business_name" 
                  name="business_name" 
                  placeholder="e.g. Macrotek Digital Solutions" 
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus-visible:ring-neutral-500 h-12"
                  required 
                  disabled={isPending}
                />
              </div>

              {/* NEW: PHYSICAL ADDRESS FIELD */}
              <div className="space-y-2">
                <Label htmlFor="business_address" className="text-neutral-300">Business / Office Address</Label>
                <Input 
                  id="business_address" 
                  name="business_address" 
                  placeholder="e.g. 123 Rizal St., Legazpi City, Albay" 
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus-visible:ring-neutral-500 h-12"
                  required 
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-neutral-300">Base Currency</Label>
                <Input 
                  id="currency" 
                  name="currency" 
                  defaultValue="PHP" 
                  className="bg-neutral-800 border-neutral-700 text-white focus-visible:ring-neutral-500 uppercase h-12"
                  maxLength={3}
                  required 
                  disabled={isPending}
                />
                <p className="text-xs text-neutral-500">Standard 3-letter currency code (e.g., PHP, USD).</p>
              </div>
            </div>
          </div>

          <div className="mt-12">
            {error && (
              <div className="mb-6 p-4 text-sm text-red-200 bg-red-950/50 border border-red-900 rounded-lg">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full bg-white text-neutral-900 hover:bg-neutral-200 font-bold py-6 text-base transition-all active:scale-95" 
              disabled={isPending}
            >
              {isPending ? "Provisioning Tenant..." : "Initialize Business"}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: TELEMETRY & SURVEY (Light Canvas) */}
        <div className="w-full lg:w-3/5 p-8 md:p-12 bg-white">
          <div className="mb-8 border-b border-neutral-100 pb-6">
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Tailor Your Experience</h2>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-2xl">
              Help us build the features that matter most to your business. Your selections will help us prioritize future updates and notify you when these services become available.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="space-y-3">
              <Label className="text-neutral-900 font-semibold text-sm">1. What best describes your business?</Label>
              <Select value={industry} onValueChange={setIndustry} disabled={isPending}>
                <SelectTrigger className="w-full border-neutral-300 h-11">
                  <SelectValue placeholder="Select an industry..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail Store">Retail Store</SelectItem>
                  <SelectItem value="Wholesale">Wholesale</SelectItem>
                  <SelectItem value="Service Business">Service Business</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                  <SelectItem value="Construction">Construction</SelectItem>
                  <SelectItem value="Logistics & Transportation">Logistics & Transportation</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Lending / Financing">Lending / Financing</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Technology and E-commerce">Technology and E-commerce</SelectItem>
                  <SelectItem value="Communication / BPO">Communication / BPO</SelectItem>
                  <SelectItem value="Freelancer / Professional">Freelancer / Professional</SelectItem>
                  <SelectItem value="Non-profit">Non-profit</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-neutral-900 font-semibold text-sm">2. How many people work in your business?</Label>
              <Select value={employeeCount} onValueChange={setEmployeeCount} disabled={isPending}>
                <SelectTrigger className="w-full border-neutral-300 h-11">
                  <SelectValue placeholder="Select team size..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Just Me">Just Me</SelectItem>
                  <SelectItem value="2–5">2–5</SelectItem>
                  <SelectItem value="6–20">6–20</SelectItem>
                  <SelectItem value="21–50">21–50</SelectItem>
                  <SelectItem value="51–200">51–200</SelectItem>
                  <SelectItem value="200+">200+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-neutral-900 font-semibold block text-sm">
              3. What other business tools would you like MacroBiz to offer in the future?
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2">
              {FEATURE_OPTIONS.map((feature) => (
                <label 
                  key={feature} 
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-neutral-50 transition-colors cursor-pointer group border border-transparent hover:border-neutral-200"
                >
                  <div className="flex items-center h-5 mt-0.5 shrink-0">
                    <input 
                      type="checkbox" 
                      checked={selectedFeatures.includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      disabled={isPending}
                      className="w-4 h-4 text-neutral-900 bg-white border-neutral-300 rounded focus:ring-neutral-900 focus:ring-2 transition-all"
                    />
                  </div>
                  <span className="text-xs text-neutral-600 group-hover:text-neutral-900 font-medium leading-tight pt-0.5">
                    {feature}
                  </span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </form>
    </Card>
  );
}