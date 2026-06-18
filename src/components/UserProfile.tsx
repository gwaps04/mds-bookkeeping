// src/components/UserProfile.tsx
"use client";

import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/actions";

interface UserProfileProps {
  email: string;
  roleLabel: string;
  businessName: string;
  fullName?: string;
}

export default function UserProfile({ email, roleLabel, businessName, fullName }: UserProfileProps) {
  
  const getInitials = (name?: string, fallbackEmail?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name[0].toUpperCase();
    }
    return fallbackEmail ? fallbackEmail[0].toUpperCase() : 'U';
  };

  const displayName = fullName || email;
  const initials = getInitials(fullName, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-auto flex items-center gap-3 pl-2 pr-4 rounded-full hover:bg-neutral-100 transition-colors">
          <Avatar className="h-8 w-8 border border-neutral-200">
            <AvatarImage src="" alt={displayName} />
            <AvatarFallback className="bg-neutral-900 text-white font-medium text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left hidden sm:flex">
            <span className="text-sm font-semibold text-neutral-900 leading-none">{displayName}</span>
            <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mt-1">{businessName}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mt-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-neutral-900">{displayName}</p>
            <p className="text-xs leading-none text-neutral-500 mt-1">{email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <div className="px-2 py-1.5 text-xs font-medium text-neutral-500 flex justify-between items-center">
            <span>Role</span>
            <span className="bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">{roleLabel}</span>
          </div>
          <div className="px-2 py-1.5 text-xs font-medium text-neutral-500 flex justify-between items-center mb-1">
            <span>Tenant</span>
            <span className="text-neutral-900 truncate max-w-[120px]" title={businessName}>{businessName}</span>
          </div>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        
        {/* THE FIX: A raw HTML form bypassing Radix UI event blockers */}
        <div className="p-1">
          <form action={logout}>
            <button 
              type="submit" 
              className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm font-medium outline-none transition-colors hover:bg-red-50 text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </button>
          </form>
        </div>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}