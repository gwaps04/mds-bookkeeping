// src/app/(dashboard)/expenses/[id]/edit/ReceiptInput.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Lock, FileText, CheckCircle2 } from "lucide-react";

interface ReceiptInputProps {
  isLocked: boolean;
  hasExistingReceipt: boolean;
}

export default function ReceiptInput({ isLocked, hasExistingReceipt }: ReceiptInputProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  if (isLocked) {
    return (
      <div className="space-y-3 p-4 bg-neutral-50 rounded-lg border-2 border-neutral-200 border-dashed relative overflow-hidden opacity-80 select-none grayscale">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-200 border border-neutral-300 rounded text-neutral-500 shadow-sm">
            <Lock size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Locked</span>
          </div>
          <Label className="text-neutral-500 font-semibold flex items-center gap-1.5 cursor-not-allowed">
            Attach Receipt (Premium)
          </Label>
        </div>
        <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
          This feature is disabled. Upgrade your account tier to unlock digital document storage and mobile scanning.
        </p>
        <Input type="file" disabled className="cursor-not-allowed file:text-neutral-400 file:font-semibold file:bg-neutral-100 file:border file:border-neutral-200 file:rounded-md file:px-4 file:py-1.5 file:mr-4 text-neutral-400 text-xs bg-transparent border-0 p-0 h-auto w-full" />
      </div>
    );
  }

  return (
    <div className={`space-y-3 p-4 rounded-lg border-2 border-dashed relative group overflow-hidden transition-colors ${selectedFile ? 'bg-emerald-50/50 border-emerald-300' : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 hover:border-blue-300'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`flex items-center gap-1.5 px-2 py-1 bg-white border rounded shadow-sm transition-colors ${selectedFile ? 'text-emerald-600 border-emerald-200' : 'text-blue-600 border-blue-200'}`}>
          {selectedFile ? <CheckCircle2 size={14} /> : <Camera size={14} className="md:hidden" />}
          {!selectedFile && <Upload size={14} className="hidden md:block" />}
          <span className="text-[10px] font-bold uppercase tracking-wider">{selectedFile ? 'Ready' : (hasExistingReceipt ? 'Replace' : 'Upload')}</span>
        </div>
        <Label htmlFor="receipt" className="text-neutral-700 font-semibold cursor-pointer">
          {hasExistingReceipt ? "Replace Receipt (Optional)" : "Attach Receipt (Optional)"}
        </Label>
      </div>

      {/* THE FIX: THE HIGHLIGHTED FILE NAME BADGE */}
      {selectedFile ? (
        <div className="mt-3 p-2.5 bg-emerald-100/50 border border-emerald-200 rounded-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
          <FileText size={16} className="text-emerald-600 shrink-0" />
          <span className="text-xs font-bold text-emerald-800 truncate">{selectedFile}</span>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-neutral-500 leading-relaxed mb-3 md:hidden">
            Tap below to open your camera. {hasExistingReceipt ? "This will overwrite the current file." : ""}
          </p>
          <p className="text-[11px] text-neutral-500 leading-relaxed mb-3 hidden md:block">
            Click below to select an image or PDF. {hasExistingReceipt ? "This will overwrite the current file." : ""}
          </p>
        </>
      )}

      {/* DOM LISTENER: Captures the file name on selection */}
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
        className={`cursor-pointer file:font-semibold file:bg-white file:border file:rounded-md file:px-4 file:py-1.5 file:mr-4 file:transition-colors file:shadow-sm text-xs bg-transparent border-0 p-0 h-auto w-full ${selectedFile ? 'file:text-emerald-700 file:border-emerald-200 file:hover:bg-emerald-50 text-emerald-700' : 'file:text-blue-700 file:border-blue-200 file:hover:bg-blue-50 text-neutral-500'}`} 
      />
    </div>
  );
}