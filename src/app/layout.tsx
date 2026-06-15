// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Load the Inter font with latin subsets
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MDS Bookkeeping",
  description: "Enterprise Financial Ledger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* antialiased smooths the font rendering, bg-neutral-50 sets our Nova canvas */}
      <body className={`${inter.className} antialiased bg-neutral-50 text-neutral-900 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}