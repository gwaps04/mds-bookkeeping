// src/features/inventory/components/ItemRowActions.tsx
"use client";

import { useState } from "react";
import { updateItem, archiveItem, getItemHistory, reverseStockMovement } from "@/features/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import SubmitButton from "@/components/SubmitButton";
import { Edit2, Trash2, X, History, Loader2, ArrowDownRight, ArrowUpRight, MinusCircle, Undo2 } from "lucide-react";

export default function ItemRowActions({ item }: { item: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [unitOfMeasure, setUnitOfMeasure] = useState(item.unit_of_measure || "pcs");
  
  // HISTORY MODAL STATE
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  const handleOpenHistory = async () => {
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    try {
      const data = await getItemHistory(item.id);
      setHistoryData(data || []);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // THE REVERSAL HANDLER
  const handleReverse = async (movementId: string) => {
    if (!confirm("Are you sure you want to reverse this entry?\n\nThis will NOT delete the record. It will post a new 'Contra Entry' to correct the ledger balance.")) return;
    
    setIsLoadingHistory(true);
    try {
      const fd = new FormData();
      fd.append("movement_id", movementId);
      await reverseStockMovement(fd);
      
      const data = await getItemHistory(item.id);
      setHistoryData(data || []);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      
      {/* HISTORY BUTTON */}
      <Button variant="outline" size="sm" onClick={handleOpenHistory} className="h-8 w-8 p-0 text-emerald-600 border-emerald-200 hover:bg-emerald-50 shadow-sm transition-colors shrink-0" title="View Stock History">
        <History size={14} />
      </Button>

      {/* EDIT BUTTON */}
      <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="h-8 w-8 p-0 text-blue-600 border-blue-200 hover:bg-blue-50 shadow-sm transition-colors shrink-0" title="Edit Item">
        <Edit2 size={14} />
      </Button>

      {/* ARCHIVE (SOFT DELETE) FORM */}
      <form action={archiveItem} onSubmit={(e) => { if(!confirm("Are you sure you want to archive this item? It will be hidden from the catalog.")) e.preventDefault(); }}>
        <input type="hidden" name="id" value={item.id} />
        <Button type="submit" variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 shadow-sm transition-colors shrink-0" title="Archive Item">
          <Trash2 size={14} />
        </Button>
      </form>

      {/* ============================================================================ */}
      {/* 1. THE HISTORY MODAL (STOCK CARD) - FLUID OPTIMIZED */}
      {/* ============================================================================ */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-[100] bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4 text-left sm:p-6">
          {/* THE FIX: max-h-[90dvh] ensures it perfectly fits mobile browser viewports */}
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-neutral-100 bg-white shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="font-bold text-base sm:text-lg text-neutral-900 flex items-center gap-2 truncate">
                  <History size={18} className="text-emerald-600 shrink-0" /> Stock Movement History
                </h3>
                <p className="text-[10px] sm:text-xs text-neutral-500 mt-0.5 font-medium truncate">Audit trail for <span className="font-bold text-neutral-700">{item.name}</span></p>
              </div>
              <button type="button" onClick={() => setIsHistoryOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors shrink-0"><X size={20}/></button>
            </div>
            
            {/* THE FIX: Added overflow-auto to the wrapper and w-full min-w-0 to prevent flex blowout */}
            <div className="p-0 overflow-auto bg-neutral-50/50 flex-1 w-full min-w-0 relative">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
                  <Loader2 size={32} className="animate-spin mb-3 text-emerald-600" />
                  <p className="text-sm font-medium">Fetching ledger records...</p>
                </div>
              ) : historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center text-neutral-400">
                  <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                    <History size={24} className="text-neutral-300" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600">No stock movements recorded.</p>
                  <p className="text-xs mt-1">This item has not received or lost any physical stock yet.</p>
                </div>
              ) : (
                <div className="w-full min-w-0">
                  <table className="w-full text-left text-sm table-auto">
                    <thead className="bg-neutral-100/90 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 sm:px-5 py-3 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] whitespace-nowrap">Date & Time</th>
                        <th className="px-4 sm:px-5 py-3 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] whitespace-nowrap">Action</th>
                        <th className="px-4 sm:px-5 py-3 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] text-right whitespace-nowrap">Qty</th>
                        <th className="px-4 sm:px-5 py-3 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] w-full min-w-[150px]">Notes</th>
                        <th className="px-4 sm:px-5 py-3 font-semibold text-neutral-600 uppercase tracking-wider text-[10px] text-center whitespace-nowrap">Revert</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {historyData.map((log) => {
                        const isStockIn = log.type === 'STOCK_IN';
                        const isStockOut = log.type === 'STOCK_OUT';
                        const isSale = log.type === 'SALE';
                        const isReversal = log.reference_type === 'REVERSAL';
                        
                        return (
                          <tr key={log.id} className={`transition-colors group ${isReversal ? 'bg-neutral-50/50 opacity-70' : 'hover:bg-neutral-50'}`}>
                            <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap align-top">
                              <p className="text-[11px] sm:text-xs font-bold text-neutral-700">{new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              <p className="text-[9px] sm:text-[10px] text-neutral-400 font-mono mt-0.5">{new Date(log.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</p>
                            </td>
                            <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap align-top">
                              {isReversal ? (
                                 <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded shadow-sm"><Undo2 size={12} className="mr-1 shrink-0"/> Void Entry</span>
                              ) : isStockIn ? (
                                <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shadow-sm"><ArrowDownRight size={12} className="mr-1 shrink-0"/> Received</span>
                              ) : isStockOut ? (
                                <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded shadow-sm"><MinusCircle size={12} className="mr-1 shrink-0"/> Manual Out</span>
                              ) : isSale ? (
                                <span className="inline-flex items-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded shadow-sm"><ArrowUpRight size={12} className="mr-1 shrink-0"/> Sale</span>
                              ) : null}
                            </td>
                            <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap text-right align-top">
                              <span className={`font-black text-sm sm:text-base ${isStockIn ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isStockIn ? '+' : '-'}{Number(log.quantity).toLocaleString()}
                              </span>
                            </td>
                            {/* THE FIX: whitespace-normal prevents horizontal scroll bloat if notes are long */}
                            <td className="px-4 sm:px-5 py-3.5 text-[11px] sm:text-xs text-neutral-600 leading-snug whitespace-normal break-words min-w-[150px] align-top">
                              {log.notes ? log.notes : <span className="text-neutral-400 italic">No notes provided</span>}
                            </td>
                            <td className="px-4 sm:px-5 py-3.5 whitespace-nowrap text-center align-top">
                              {!isReversal && (
                                 <Button type="button" onClick={() => handleReverse(log.id)} variant="ghost" size="sm" className="h-7 px-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100">
                                   Reverse
                                 </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 sm:p-5 border-t border-neutral-100 bg-white shrink-0 flex justify-end">
               <Button type="button" variant="outline" onClick={() => setIsHistoryOpen(false)} className="text-neutral-600 w-full sm:w-auto font-bold shadow-sm">Close Ledger</Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* 2. THE EDIT MODAL - FLUID OPTIMIZED */}
      {/* ============================================================================ */}
      {isEditOpen && (
        <div className="fixed inset-0 z-[100] bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4 text-left sm:p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
              <h3 className="font-bold text-lg text-neutral-900">Edit Catalog Item</h3>
              <button type="button" onClick={() => setIsEditOpen(false)} className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors shrink-0"><X size={20}/></button>
            </div>
            
            <div className="p-0 overflow-y-auto w-full min-w-0">
              <form action={async (fd) => { await updateItem(fd); setIsEditOpen(false); }} className="p-4 sm:p-5 space-y-4 sm:space-y-5">
                <input type="hidden" name="id" value={item.id} />
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Item Name</Label>
                  <Input name="name" defaultValue={item.name} className="h-11" required />
                </div>
                
                {/* THE FIX: Changed grid-cols-2 to grid-cols-1 sm:grid-cols-2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">SKU</Label>
                    <Input name="sku" defaultValue={item.sku} className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Unit of Measure</Label>
                    <Select name="unit_of_measure" value={unitOfMeasure} onValueChange={setUnitOfMeasure} required>
                      <SelectTrigger className="h-11 bg-white border-neutral-300 focus:ring-neutral-900"><SelectValue placeholder="Select unit..." /></SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        <SelectGroup>
                          <SelectLabel>Physical Count</SelectLabel>
                          <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                          <SelectItem value="box">Box (box)</SelectItem>
                          <SelectItem value="pack">Pack (pack)</SelectItem>
                          <SelectItem value="set">Set (set)</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Weight & Volume</SelectLabel>
                          <SelectItem value="grams">Grams (g)</SelectItem>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="ml">Milliliters (ml)</SelectItem>
                          <SelectItem value="liter">Liters (L)</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Length</SelectLabel>
                          <SelectItem value="cm">Centimeters (cm)</SelectItem>
                          <SelectItem value="meter">Meters (m)</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Services</SelectLabel>
                          <SelectItem value="hour">Hours (hr)</SelectItem>
                          <SelectItem value="session">Session</SelectItem>
                          <SelectItem value="serving">Serving</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* THE FIX: Changed grid-cols-2 to grid-cols-1 sm:grid-cols-2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Unit Cost (₱)</Label>
                    <Input name="unit_cost" type="number" step="0.01" defaultValue={item.unit_cost} className="h-11 font-mono" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Selling Price (₱)</Label>
                    <Input name="selling_price" type="number" step="0.01" defaultValue={item.selling_price} className="h-11 font-mono" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Reorder Threshold</Label>
                  <Input name="reorder_threshold" type="number" defaultValue={item.reorder_threshold} className="h-11" required />
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <Button type="button" variant="outline" className="w-full sm:flex-1 h-11 font-bold text-neutral-600" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <SubmitButton title="Save Changes" className="w-full sm:flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold" />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}