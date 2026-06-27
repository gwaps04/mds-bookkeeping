// src/app/(dashboard)/invoices/[id]/page.tsx
"use client"; 

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client"; 
import { recordInvoicePayment } from "@/features/invoices/actions";
import { processRefundRequest } from "@/features/refunds/actions"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SubmitButton from "@/components/SubmitButton";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ViewInvoicePage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const supabase = createClient();
  
  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [refundRequests, setRefundRequests] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [businessName, setBusinessName] = useState("");
  
  // RBAC States
  const [userRole, setUserRole] = useState("");
  const [allowStaffPayment, setAllowStaffPayment] = useState(true);
  const [allowStaffRefund, setAllowStaffRefund] = useState(true);
  
  // Form States
  const [displayAmount, setDisplayAmount] = useState("");
  const [rawAmount, setRawAmount] = useState(0);
  
  // Refund States & Security
  const [refundDisplay, setRefundDisplay] = useState("");
  const [refundRaw, setRefundRaw] = useState(0);
  const [refundError, setRefundError] = useState("");

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id, role, businesses(business_name, allow_staff_payment_logging, allow_staff_refund_request)")
        .eq("id", user.id)
        .single();
        
      const bId = profile?.business_id;
      const businessesData = profile?.businesses as any;
      
      setUserRole(profile?.role || "");
      setBusinessName(Array.isArray(businessesData) ? businessesData[0]?.business_name : businessesData?.business_name);
      setAllowStaffPayment(Array.isArray(businessesData) ? businessesData[0]?.allow_staff_payment_logging : businessesData?.allow_staff_payment_logging);
      setAllowStaffRefund(Array.isArray(businessesData) ? businessesData[0]?.allow_staff_refund_request ?? true : businessesData?.allow_staff_refund_request ?? true);

      const { data: inv } = await supabase.from("invoices").select(`*, invoice_items(*)`).eq("id", params.id).eq("business_id", bId).single();
      if (!inv) return router.push("/invoices");
      setInvoice(inv);

      const { data: pays } = await supabase.from("income").select("id, amount, date, reference_number, description").eq("invoice_id", params.id).order("date", { ascending: false });
      setPayments(pays || []);

      const { data: refs } = await supabase.from("refund_requests").select("*").eq("invoice_id", params.id).order("created_at", { ascending: false });
      setRefundRequests(refs || []);

      const { data: banks } = await supabase.from("accounts").select("id, name").eq("business_id", bId).eq("type", "asset");
      setBankAccounts(banks || []);
    }
    fetchData();
  }, [params.id]);

  if (!invoice) return <div className="p-12 text-center animate-pulse text-neutral-500">Loading Enterprise A/R Data...</div>;

  // --- ADVANCED ACCOUNTING RECONCILIATION ---
  const totalDue = Number(invoice.total_amount);
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const approvedRefunds = refundRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + Number(r.amount), 0);
  
  const netPaid = totalPayments - approvedRefunds;
  const remainingBalance = Math.max(0, totalDue - netPaid);
  const overpaymentAmount = Math.max(0, netPaid - totalDue);
  
  const isFullyPaid = remainingBalance === 0 && overpaymentAmount === 0;
  const isOverpaid = overpaymentAmount > 0;

  // Security Variable for Render Logic
  const isOwner = userRole === 'business_owner' || userRole === 'super_admin';
  const canProcessRefund = isOwner || (userRole === 'staff' && allowStaffRefund);

  // --- FORMATTERS ---
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setRaw: any, setDisplay: any) => {
    const value = e.target.value.replace(/[^0-9.]/g, ''); 
    if (!value) { setDisplay(''); setRaw(0); return; }
    const num = parseFloat(value);
    if (!isNaN(num)) { setRaw(num); setDisplay(num.toLocaleString('en-US')); } 
    else { setDisplay(value); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      
      <div className="flex items-center justify-between">
        <Link href="/invoices">
          <Button variant="outline" size="sm" className="bg-white text-neutral-600">&larr; Back to Ledger</Button>
        </Link>
        <div className="flex gap-2">
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button variant="outline" size="sm" className="bg-white text-blue-600 border-blue-200">Edit Invoice</Button>
          </Link>
          <Button size="sm" className="bg-neutral-900 text-white">🖨️ Print PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: PRINTABLE INVOICE */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-neutral-200 bg-white min-h-[800px] p-8 md:p-12 relative overflow-hidden">
            <div className="flex justify-between items-start mb-16 relative z-10">
              <div>
                <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-black text-neutral-900 uppercase tracking-tighter">INVOICE</h1>
                  
                  {isOverpaid ? (
                    <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Overpaid</span>
                  ) : isFullyPaid ? (
                    <span className="bg-green-100 text-green-700 border border-green-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Fully Paid</span>
                  ) : netPaid > 0 ? (
                    <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Partially Paid</span>
                  ) : null}

                </div>
                <p className="text-neutral-500 font-mono mt-2 text-sm">#{invoice.id.split('-')[0].toUpperCase()}</p>
              </div>
              
              <div className="text-right">
                <p className="font-bold text-neutral-900 text-xl">{businessName}</p>
                <p className="text-neutral-500 mt-1 text-sm">Date Issued: {new Date(invoice.created_at).toLocaleDateString()}</p>
                <p className="text-red-600 font-medium text-sm mt-1">Due Date: {new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-12 p-6 bg-neutral-50 rounded-lg border border-neutral-100 relative z-10">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Billed To</p>
              <p className="text-xl font-bold text-neutral-900">{invoice.client_name}</p>
            </div>

            <table className="w-full text-left mb-8 relative z-10">
              <thead className="border-b-2 border-neutral-900 text-sm">
                <tr>
                  <th className="py-3 font-bold text-neutral-900 uppercase tracking-wider">Description</th>
                  <th className="py-3 font-bold text-neutral-900 uppercase tracking-wider text-center">Qty</th>
                  <th className="py-3 font-bold text-neutral-900 uppercase tracking-wider text-right">Price</th>
                  <th className="py-3 font-bold text-neutral-900 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(invoice.invoice_items || []).map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-4 text-neutral-800">{item.description}</td>
                    <td className="py-4 text-center text-neutral-600">{item.quantity}</td>
                    <td className="py-4 text-right text-neutral-600">₱{Number(item.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-4 text-right font-medium text-neutral-900">₱{Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-col md:flex-row justify-between items-start pt-6 border-t border-neutral-100 relative z-10">
              <div className="w-full md:w-1/2 mb-6 md:mb-0">
                {payments.length > 0 && (
                  <div className="pr-8">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Payment History</p>
                    <div className="space-y-2">
                      {payments.map((p: any) => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span className="text-neutral-500">Received on {new Date(p.date).toLocaleDateString()}</span>
                          <span className="font-medium text-green-700">₱{Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      {refundRequests.filter(r => r.status === 'approved').map((r: any) => (
                        <div key={r.id} className="flex justify-between text-sm">
                          <span className="text-neutral-500">Refunded on {new Date(r.created_at).toLocaleDateString()}</span>
                          <span className="font-medium text-orange-600">- ₱{Number(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-neutral-500 text-sm font-medium">
                  <span>Subtotal</span>
                  <span>₱{totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                {totalPayments > 0 && (
                  <div className="flex justify-between text-green-600 text-sm font-medium">
                    <span>Total Paid</span>
                    <span>- ₱{totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {approvedRefunds > 0 && (
                  <div className="flex justify-between text-orange-600 text-sm font-medium">
                    <span>Refunded</span>
                    <span>+ ₱{approvedRefunds.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {isOverpaid ? (
                  <div className="flex justify-between border-t-2 border-purple-900 pt-3 text-lg font-black text-purple-900">
                    <span>Overpayment</span>
                    <span>₱{overpaymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t-2 border-neutral-900 pt-3 text-lg font-black text-neutral-900">
                    <span>Balance Due</span>
                    <span>₱{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: TRACKERS & ACTIONS */}
        <div className="lg:col-span-1 space-y-6">
          
          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="pb-4 border-b border-neutral-100">
              <CardTitle className="text-lg">Payment & Refund Tracker</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {payments.length === 0 ? (
                <p className="text-sm text-neutral-500 italic text-center py-4">No payments linked to this invoice.</p>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment: any) => (
                    <div key={payment.id} className="flex justify-between items-center bg-green-50/50 p-3 rounded border border-green-100">
                      <div>
                        <p className="text-xs font-bold text-green-800">{new Date(payment.date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-green-600 uppercase tracking-wider">{payment.description ? payment.description : "CASH / BANK RECEIPT"}</p>
                      </div>
                      <p className="font-bold text-green-700">+₱{Number(payment.amount).toLocaleString('en-US')}</p>
                    </div>
                  ))}
                  {refundRequests.map((refund: any) => (
                    <div key={refund.id} className={`flex justify-between items-center p-3 rounded border ${refund.status === 'pending' ? 'bg-amber-50/50 border-amber-100' : 'bg-orange-50/50 border-orange-100'}`}>
                      <div>
                        <p className={`text-xs font-bold ${refund.status === 'pending' ? 'text-amber-800' : 'text-orange-800'}`}>{new Date(refund.created_at).toLocaleDateString()}</p>
                        <p className={`text-[10px] uppercase tracking-wider ${refund.status === 'pending' ? 'text-amber-600' : 'text-orange-600'}`}>
                          {refund.status === 'pending' ? 'PENDING REFUND' : 'APPROVED REFUND'} - {refund.reason}
                        </p>
                      </div>
                      <p className={`font-bold ${refund.status === 'pending' ? 'text-amber-700' : 'text-orange-700'}`}>-₱{Number(refund.amount).toLocaleString('en-US')}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {(!isFullyPaid && !isOverpaid) && (
            <>
              {isOwner || allowStaffPayment ? (
                <Card className="shadow-sm border-neutral-200 bg-blue-50/30 border-blue-100">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-900">Log a Payment</CardTitle>
                    <CardDescription>Record money received for this invoice.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form action={async (formData) => {
                      try {
                        formData.set("amount", rawAmount.toString()); 
                        await recordInvoicePayment(formData);
                        window.location.reload(); 
                      } catch (err: any) { alert("SERVER ERROR: " + err.message); }
                    }} className="space-y-4">
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <input type="hidden" name="client_name" value={invoice.client_name} />
                      <div className="space-y-2">
                        <Label htmlFor="amount_display">Amount Received (₱)</Label>
                        <Input id="amount_display" type="text" placeholder={`e.g. ${remainingBalance.toLocaleString()}`} value={displayAmount} onChange={(e) => handleAmountChange(e, setRawAmount, setDisplayAmount)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date Received</Label>
                        <Input id="date" name="date" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account_id">Deposited To (Bank)</Label>
                        <Select name="account_id" required>
                          <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                          <SelectContent>{bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 pb-2">
                        <Label htmlFor="description">Notes / Description (Optional)</Label>
                        <Input id="description" name="description" placeholder="e.g. Partial Payment, Check #123" />
                      </div>
                      <SubmitButton title="Apply Payment" loadingTitle="Processing..." className="w-full bg-blue-600 hover:bg-blue-700 text-white" />
                    </form>
                  </CardContent>
                </Card>
              ) : (
                 <Card className="shadow-sm border-neutral-200 bg-neutral-50">
                  <CardContent className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center mx-auto mb-2 text-xl shadow-inner border border-neutral-300">🔒</div>
                    <p className="font-semibold text-neutral-900 text-lg">Payment Logging Disabled</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* NEW MODULE: SECURE TOGGLEABLE REFUND SYSTEM */}
          {isOverpaid && (
            <>
              {canProcessRefund ? (
                <Card className="shadow-sm border-orange-200 bg-orange-50/30 border-orange-100">
                  <CardHeader>
                    <CardTitle className="text-lg text-orange-900">Process Refund</CardTitle>
                    <CardDescription>Clear the overpayment from the ledger.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form action={async (formData) => {
                      if (Math.round(refundRaw * 100) !== Math.round(overpaymentAmount * 100)) {
                        setRefundError(`You must refund the exact overpaid amount of ₱${overpaymentAmount.toLocaleString('en-US')}.`);
                        return; 
                      }
                      
                      try {
                        formData.set("amount", refundRaw.toString()); 
                        await processRefundRequest(formData);
                        window.location.reload(); 
                      } catch (err: any) { alert("SERVER ERROR: " + err.message); }
                    }} className="space-y-4">
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      
                      <div className="space-y-2">
                        <Label htmlFor="refund_display" className={refundError ? "text-red-600" : ""}>Refund Amount (₱)</Label>
                        <Input 
                          id="refund_display" 
                          type="text" 
                          placeholder={`Exact Amount: ₱${overpaymentAmount.toLocaleString()}`}
                          value={refundDisplay}
                          onChange={(e) => {
                            handleAmountChange(e, setRefundRaw, setRefundDisplay);
                            const val = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                            if (val && Math.round(val * 100) !== Math.round(overpaymentAmount * 100)) {
                              setRefundError(`Amount must exactly match the overpayment of ₱${overpaymentAmount.toLocaleString()}`);
                            } else {
                              setRefundError("");
                            }
                          }}
                          className={refundError ? "border-red-500 focus-visible:ring-red-500 bg-red-50/50" : ""}
                          required 
                        />
                        {refundError && <p className="text-[11px] font-semibold text-red-600 mt-1">{refundError}</p>}
                      </div>
                      
                      <div className="space-y-2 pb-2">
                        <Label htmlFor="reason">Reason for Refund</Label>
                        <Input id="reason" name="reason" placeholder="e.g. Cleared Overpayment" required />
                      </div>

                      <SubmitButton 
                        title={isOwner ? "Issue Refund Instantly" : "Request Refund Approval"} 
                        loadingTitle="Processing..." 
                        className={`w-full text-white transition-colors ${
                          refundError 
                            ? "bg-neutral-300 pointer-events-none" 
                            : isOwner 
                              ? "bg-orange-600 hover:bg-orange-700" 
                              : "bg-neutral-800 hover:bg-neutral-900"
                        }`} 
                      />
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-sm border-neutral-200 bg-neutral-50">
                  <CardContent className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2 text-xl shadow-inner border border-orange-200 text-orange-600">🔒</div>
                    <p className="font-semibold text-neutral-900 text-lg">Refund System Disabled</p>
                    <p className="text-sm text-neutral-500 leading-relaxed">
                      The business owner has restricted staff from requesting refunds. Please contact management to clear this overpayment.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}