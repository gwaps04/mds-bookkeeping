// src/app/(dashboard)/expenses/ReceiptInput.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Lock, FileText, CheckCircle2 } from "lucide-react";

interface ReceiptInputProps {
  isLocked: boolean;
}

export default function ReceiptInput({ isLocked }: ReceiptInputProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  if (isLocked) {
    return (
      <div className="space-y-3 p-4 bg-neutral-50 rounded-lg border-2 border-neutral-200 border-dashed relative overflow-hidden flex flex-col items-center text-center w-full opacity-80 grayscale select-none">
        <div className="absolute top-0 right-0 p-3 opacity-5 text-4xl pointer-events-none">🔒</div>
        <div className="p-2 bg-neutral-200 text-neutral-500 rounded-full mb-1">
          <Lock size={18} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-neutral-900">Receipt Scanning Locked</h4>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 leading-relaxed mt-1 max-w-[200px] mx-auto">
            Digital document storage and mobile scanning are available on Premium plans.
          </p>
        </div>
        <Input type="file" disabled className="hidden" />
      </div>
    );
  }

  return (
    <div className={`space-y-3 p-4 rounded-lg border-2 border-dashed relative group overflow-hidden transition-colors w-full ${selectedFile ? 'bg-emerald-50/50 border-emerald-300' : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 hover:border-blue-300'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`flex items-center gap-1.5 px-2 py-1 bg-white border rounded shadow-sm transition-colors ${selectedFile ? 'text-emerald-600 border-emerald-200' : 'text-blue-600 border-blue-200'}`}>
          {selectedFile ? <CheckCircle2 size={14} /> : <Camera size={14} className="md:hidden" />}
          {!selectedFile && <Upload size={14} className="hidden md:block" />}
          <span className="text-[10px] font-bold uppercase tracking-wider md:hidden">{selectedFile ? 'Ready' : 'Scanner'}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">{selectedFile ? 'Ready' : 'Upload'}</span>
        </div>
        <Label htmlFor="receipt" className="text-neutral-700 font-semibold cursor-pointer text-xs sm:text-sm">
          Attach Receipt (Optional)
        </Label>
      </div>
      
      {/* THE HIGHLIGHTED FILE NAME BADGE */}
      {selectedFile ? (
        <div className="mt-3 p-2.5 bg-emerald-100/50 border border-emerald-200 rounded-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
          <FileText size={16} className="text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-emerald-800 truncate">{selectedFile}</span>
        </div>
      ) : (
        <>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 leading-relaxed mb-3 md:hidden">
            Tap the button below to open your camera and scan a receipt.
          </p>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 leading-relaxed mb-3 hidden md:block">
            Click below to select a scanned image or PDF from your computer.
          </p>
        </>
      )}
      
      {/* DOM LISTENER */}
      <Input 
        id="receipt" 
        name="receipt" 
        type="file" 
        accept="image/jpeg, image/png, application/pdf" 
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0].name);
          } else {
            setSelectedFile(null);
          }
        }}
        className={`cursor-pointer file:font-semibold file:bg-white file:border file:rounded-md file:px-3 file:py-1.5 file:mr-3 file:transition-colors file:shadow-sm text-[10px] sm:text-xs bg-transparent border-0 p-0 h-auto w-full ${selectedFile ? 'file:text-emerald-700 file:border-emerald-200 file:hover:bg-emerald-50 text-emerald-700' : 'file:text-blue-700 file:border-blue-200 file:hover:bg-blue-50 text-neutral-500'}`} 
      />
    </div>
  );
}