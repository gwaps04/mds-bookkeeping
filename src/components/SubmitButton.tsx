// src/components/SubmitButton.tsx
"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  loadingTitle?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function SubmitButton({ 
  title, 
  loadingTitle = "Processing...", 
  variant = "default",
  size = "default",
  className,
  ...props 
}: SubmitButtonProps) {
  
  // This Next.js hook automatically listens to the <form action={...}> it is placed inside!
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      disabled={pending || props.disabled} 
      variant={variant}
      size={size}
      className={className}
      {...props}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          {/* A clean, native spinning SVG loader */}
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {loadingTitle}
        </span>
      ) : (
        title
      )}
    </Button>
  );
}