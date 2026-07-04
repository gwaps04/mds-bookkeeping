"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { toggleBusinessFeature } from "@/features/businesses/actions";
import { Settings2, Loader2 } from "lucide-react";

export default function ManageFeaturesButton({ businessId, businessName, currentReceiptStatus }: { businessId: string, businessName: string, currentReceiptStatus: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReceiptsEnabled, setIsReceiptsEnabled] = useState(currentReceiptStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);
    try {
      await toggleBusinessFeature(businessId, 'allow_receipt_uploads', checked);
      setIsReceiptsEnabled(checked);
    } catch (error) {
      console.error("Failed to toggle feature:", error);
      // Revert UI on failure
      setIsReceiptsEnabled(!checked);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs flex items-center gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          <Settings2 size={12} />
          Features
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Features</DialogTitle>
          <DialogDescription>
            Enable or disable premium SaaS features for <strong>{businessName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-between space-x-2 p-4 border border-neutral-200 rounded-lg bg-neutral-50">
            <div className="flex flex-col space-y-1">
              <Label className="text-sm font-semibold">Receipt Scanning & Storage</Label>
              <p className="text-xs text-neutral-500">Allow users to upload and store binary files via Supabase Storage.</p>
            </div>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            ) : (
              /* THE FIX: Injected data-state modifiers for high-contrast colors */
              <Switch 
                checked={isReceiptsEnabled} 
                onCheckedChange={handleToggle} 
                className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-neutral-300"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}