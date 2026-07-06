// src/app/(dashboard)/admin/businesses/OwnerProfileDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Calendar, Shield, Building2, MapPin, X } from "lucide-react";

export default function OwnerProfileDialog({ owner, businesses }: { owner: any, businesses: any[] }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!owner) return null;

  const joinDate = owner.created_at ? new Date(owner.created_at).toLocaleDateString() : 'Unknown';

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)} 
        className="h-8 px-3 text-xs bg-white text-neutral-700 hover:bg-neutral-50 shadow-sm border-neutral-200 transition-colors"
      >
        <User size={14} className="mr-1.5" /> View Profile
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {owner.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-lg leading-none">{owner.full_name || 'Unknown Owner'}</h3>
                  <span className="text-xs font-medium text-neutral-500 flex items-center gap-1 mt-1.5">
                    <Shield size={12} className="text-indigo-600" /> Platform ID: <span className="font-mono">{owner.id.split('-')[0]}</span>
                  </span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* Identity Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Identity & Contact</h4>
                
                <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 bg-white shadow-sm">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-md"><Mail size={16} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email Address</p>
                    <p className="text-sm font-medium text-neutral-900">{owner.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 bg-white shadow-sm">
                  <div className="p-2 bg-green-50 text-green-600 rounded-md"><Phone size={16} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mobile Number</p>
                    <p className="text-sm font-medium text-neutral-900">{owner.mobile_number || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-neutral-100 bg-white shadow-sm">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-md"><Calendar size={16} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Platform Join Date</p>
                    <p className="text-sm font-medium text-neutral-900">{joinDate}</p>
                  </div>
                </div>
              </div>

              {/* Commercial Footprint Section */}
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Commercial Footprint ({businesses.length} Workspaces)</h4>
                
                {businesses.map((biz, index) => (
                  <div key={biz.id} className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-neutral-500" />
                      <span className="text-sm font-bold text-neutral-900">{biz.business_name}</span>
                      {index === 0 && (
                        <span className="ml-auto px-1.5 py-0.5 bg-neutral-200 text-neutral-600 rounded text-[9px] font-bold uppercase tracking-wider">Main</span>
                      )}
                    </div>
                    <div className="flex items-start gap-2 text-neutral-600 pl-1">
                      <MapPin size={12} className="shrink-0 mt-0.5 text-neutral-400" />
                      <span className="text-xs leading-relaxed">{biz.address || 'No commercial address registered.'}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* MODAL FOOTER */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="bg-white">Close Profile</Button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}