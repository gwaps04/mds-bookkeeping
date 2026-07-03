// src/app/(dashboard)/dashboard/DashboardFilter.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DashboardFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Establish absolute real-world time for our defaults
  const currentDate = new Date();
  
  // 2. Read URL params, fallback to current time if missing
  // JavaScript months are 0-indexed (0=Jan, 11=Dec), so we add 1 for human-readable URLs
  const currentMonth = searchParams.get("month") || String(currentDate.getMonth() + 1);
  const currentYear = searchParams.get("year") || String(currentDate.getFullYear());

  // 3. Inject the specific selection into the URL
  const handleFilterChange = (key: "month" | "year", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  // Generate an array of the last 5 years dynamically
  const years = Array.from({ length: 5 }, (_, i) => String(currentDate.getFullYear() - i));

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-neutral-500 hidden md:inline-block">Filter:</span>
      
      {/* MONTH SELECTOR */}
      <Select value={currentMonth} onValueChange={(val) => handleFilterChange("month", val)}>
        <SelectTrigger className="w-[130px] bg-white border-neutral-200 focus:ring-neutral-900 shadow-sm text-sm">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Year</SelectItem>
          <SelectItem value="1">January</SelectItem>
          <SelectItem value="2">February</SelectItem>
          <SelectItem value="3">March</SelectItem>
          <SelectItem value="4">April</SelectItem>
          <SelectItem value="5">May</SelectItem>
          <SelectItem value="6">June</SelectItem>
          <SelectItem value="7">July</SelectItem>
          <SelectItem value="8">August</SelectItem>
          <SelectItem value="9">September</SelectItem>
          <SelectItem value="10">October</SelectItem>
          <SelectItem value="11">November</SelectItem>
          <SelectItem value="12">December</SelectItem>
        </SelectContent>
      </Select>

      {/* YEAR SELECTOR */}
      <Select value={currentYear} onValueChange={(val) => handleFilterChange("year", val)}>
        <SelectTrigger className="w-[100px] bg-white border-neutral-200 focus:ring-neutral-900 shadow-sm text-sm">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}