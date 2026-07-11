// src/components/TablePagination.tsx
"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
}

export default function TablePagination({ totalItems, itemsPerPage, currentPage }: TablePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const navigateToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      router.push(createPageURL(pageNumber));
    }
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white border-t border-neutral-200">
      <div className="text-sm text-neutral-500 mb-4 sm:mb-0">
        Showing <span className="font-bold text-neutral-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
        <span className="font-bold text-neutral-900">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
        <span className="font-bold text-neutral-900">{totalItems}</span> entries
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-neutral-500"
          onClick={() => navigateToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} />
        </Button>

        <div className="flex items-center gap-1 px-2 text-sm font-medium text-neutral-700">
          Page {currentPage} of {totalPages}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 text-neutral-500"
          onClick={() => navigateToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}