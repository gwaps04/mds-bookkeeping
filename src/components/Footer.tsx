// src/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto py-8 px-4 sm:px-6 border-t border-neutral-200 bg-white">
      {/* 
        THE FIX 1: Changed `md:flex-row` to `lg:flex-row`. 
        Because the email and copyright text are so long, they need until the `lg` breakpoint (1024px) 
        to safely sit side-by-side without crashing into each other. 
      */}
      <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4 text-xs text-neutral-500 w-full min-w-0">
        
        {/* Left Side: Copyright & Developer */}
        <div className="flex flex-col sm:flex-row items-center justify-center text-center lg:text-left gap-1 sm:gap-2 w-full lg:w-auto">
          <span>&copy; {currentYear} MDS Bookkeeping Platform. All rights reserved.</span>
          
          {/* THE FIX 2: Hide the pipe separator on mobile when stacked vertically */}
          <span className="hidden sm:inline text-neutral-300">|</span>
          
          <span className="flex items-center flex-wrap justify-center gap-1">
            Developed by{" "}
            <a 
              href="https://www.macrotekdigitalsolutions.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold text-neutral-700 hover:text-blue-600 transition-colors py-1 px-1 -mx-1"
            >
              Macrotek Digital Solutions
            </a>
          </span>
        </div>

        {/* Right Side: Contact Info */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center lg:text-right font-mono w-full lg:w-auto">
          <a 
            href="mailto:macrotekdigitalsolutions@gmail.com" 
            className="hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5 py-1.5 px-2 -mx-2 break-all sm:break-normal"
          >
            <span className="text-sm">✉</span> macrotekdigitalsolutions@gmail.com
          </a>
          
          {/* THE FIX 3: Hide the pipe separator on mobile when stacked vertically */}
          <span className="hidden sm:inline text-neutral-300">|</span>
          
          <a 
            href="tel:09563355850" 
            className="hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5 py-1.5 px-2 -mx-2"
          >
            <span className="text-sm">☏</span> 0956 335 5850
          </a>
        </div>

      </div>
    </footer>
  );
}