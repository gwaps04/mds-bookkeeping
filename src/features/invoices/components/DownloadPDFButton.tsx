// src/features/invoices/components/DownloadPDFButton.tsx
"use client";

import { useState } from "react";
import { pdf } from '@react-pdf/renderer';
import { InvoiceTemplate } from "./InvoiceTemplate";
import { Button } from "@/components/ui/button";

export function DownloadPDFButton({ invoice, items, business, currency }: any) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // 1. Compile the React Component into a PDF Document Blob
      const blob = await pdf(
        <InvoiceTemplate 
          invoice={invoice} 
          items={items} 
          business={business} 
          currency={currency} 
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
    >
      {isGenerating ? "Generating..." : "Download PDF"}
    </Button>
  );
}