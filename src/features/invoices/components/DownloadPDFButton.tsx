// src/features/invoices/components/DownloadPDFButton.tsx
"use client";

import { useState } from "react";
import { pdf } from '@react-pdf/renderer';
import { InvoiceTemplate } from "./InvoiceTemplate";
import { Button } from "@/components/ui/button";

export function DownloadPDFButton({ invoice, items, business, currency, payments, refunds }: any) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // 1. Compile the React Component into a PDF Document Blob (Now with payments/refunds!)
      const blob = await pdf(
        <InvoiceTemplate 
          invoice={invoice} 
          items={items} 
          business={business} 
          currency={currency} 
          payments={payments}
          refunds={refunds}
        />
      ).toBlob();

      // 2. Create a temporary URL for the Blob
      const url = URL.createObjectURL(blob);

      // 3. Force the browser to download it
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoice.client_name.replace(/\s+/g, '_')}_${invoice.id.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Failed to generate PDF. Check console.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleDownload} 
      disabled={isGenerating}
      className="flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      {isGenerating ? "Compiling PDF..." : "Download PDF"}
    </Button>
  );
}