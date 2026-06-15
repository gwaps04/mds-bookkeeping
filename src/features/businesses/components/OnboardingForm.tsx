// src/features/businesses/components/OnboardingForm.tsx
"use client";

import { useState, useTransition } from "react";
import { provisionTenant } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await provisionTenant(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <Card className="w-full max-w-lg shadow-xl border-neutral-200">
      <CardHeader className="space-y-2 text-center pb-8">
        <CardTitle className="text-3xl font-semibold tracking-tight">
          Establish Your Ledger
        </CardTitle>
        <CardDescription className="text-neutral-500 text-base">
          Provision your business tenant. You can update tax configurations and addresses later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="business_name" className="text-neutral-700">Business Name</Label>
            <Input 
              id="business_name" 
              name="business_name" 
              placeholder="e.g. Macrotek Digital Solutions" 
              required 
              disabled={isPending} 
              className="text-lg py-6"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-neutral-700">Base Currency</Label>
            <Input 
              id="currency" 
              name="currency" 
              defaultValue="PHP" 
              required 
              disabled={isPending} 
              className="text-lg py-6 uppercase"
              maxLength={3}
            />
            <p className="text-xs text-neutral-500">Standard 3-letter currency code (e.g., PHP, USD, EUR).</p>
          </div>

          {error && (
            <div className="p-4 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full text-lg h-12" disabled={isPending}>
            {isPending ? "Provisioning Tenant..." : "Initialize Business"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}