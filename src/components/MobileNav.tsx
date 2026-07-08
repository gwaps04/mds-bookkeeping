// src/components/MobileNav.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import SideNav from "./SideNav"; // We import the SideNav to render INSIDE the drawer

export default function MobileNav(props: any) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Smart routing: Automatically close the mobile drawer when a user taps a link!
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      
      {/* THE 44px TOUCH TARGET RULE ENFORCED */}
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-11 w-11 -ml-2 text-neutral-900 hover:bg-neutral-100 shrink-0">
          <Menu size={24} />
          <span className="sr-only">Toggle Mobile Menu</span>
        </Button>
      </SheetTrigger>
      
      {/* OFF-CANVAS DRAWER */}
      <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px] bg-white flex flex-col z-[100]">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SheetDescription className="sr-only">Access the main navigation and workspace switcher.</SheetDescription>
        
        <div className="h-16 flex items-center px-6 border-b border-neutral-200 shrink-0 bg-white">
          <span className="font-bold text-xl tracking-tight text-neutral-900">MacroBiz</span>
        </div>
        
        {/* We inject your existing SideNav component directly into the mobile drawer. 
            Because it receives the companies prop now, the Workspace Switcher will automatically render! */}
        <div className="flex-1 overflow-y-auto">
          <SideNav {...props} />
        </div>
      </SheetContent>

    </Sheet>
  );
}