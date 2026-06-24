// src/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto py-8 px-6 border-t border-neutral-200 bg-white">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
        
        {/* Left Side: Copyright & Developer */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-center md:text-left">
          <span>&copy; {currentYear} MDS Bookkeeping Platform. All rights reserved.</span>
          <span className="hidden md:inline text-neutral-300">|</span>
          <span>
            Developed by{" "}
            <a 
              href="https://www.macrotekdigitalsolutions.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold text-neutral-700 hover:text-blue-600 transition-colors"
            >
              Macrotek Digital Solutions
            </a>
          </span>
        </div>

        {/* Right Side: Contact Info */}
        <div className="flex items-center gap-4 text-center md:text-right font-mono">
          <a href="mailto:macrotekdigitalsolutions@gmail.com" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <span>✉</span> macrotekdigitalsolutions@gmail.com
          </a>
          <span className="text-neutral-300">|</span>
          <a href="tel:09563355850" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <span>☏</span> 0956 335 5850
          </a>
        </div>

      </div>
    </footer>
  );
}