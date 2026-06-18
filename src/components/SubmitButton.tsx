// src/components/SubmitButton.tsx
"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  title: string;
  loadingTitle?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function SubmitButton({ 
  title, 
  loadingTitle = "Processing...", 
  className = "",
  variant = "default",
  size = "default"
}: SubmitButtonProps) {
  // This hook magically detects if the parent form is talking to the database!
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className={className} variant={variant} size={size}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? loadingTitle : title}
    </Button>
  );
}