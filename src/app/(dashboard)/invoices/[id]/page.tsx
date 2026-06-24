// src/app/(dashboard)/invoices/[id]/page.tsx
"use client"; 

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client"; 
import { recordInvoicePayment } from "@/features/invoices/actions";
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
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [businessName, setBusinessName] = useState("");
  
  // --- NEW RBAC STATES ---
  const [userRole, setUserRole] = useState("");
  const [allowStaffPayment, setAllowStaffPayment] = useState(true);
  
  const [displayAmount, setDisplayAmount] = useState("");
  const [rawAmount, setRawAmount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // FETCH THE PROFILE + THE NEW BUSINESS SETTING
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id, role, businesses(business_name, allow_staff_payment_logging)")
        .eq("id", user.id)
        .single();
        
      const bId = profile?.business_id;
      
      const businessesData = profile?.businesses as any;
      
      // SET THE UI STATE FOR PERMISSIONS
      setUserRole(profile?.role || "");
      setBusinessName(Array.isArray(businessesData) ? businessesData[0]?.business_name : businessesData?.business_name);
      setAllowStaffPayment(Array.isArray(businessesData) ? businessesData[0]?.allow_staff_payment_logging : businessesData?.allow_staff_payment_logging);

      const { data: inv } = await supabase.from("invoices").select(`*, invoice_items(*)`).eq("id", params.id).eq("business_id", bId).single();
      if (!inv) return router.push("/invoices");
      setInvoice(inv);

      const { data: pays, error: paysError } = await supabase
        .from("income")
        .select("id, amount, date, reference_number")
        .eq("invoice_id", params.id)
        .order("date", { ascending: false });
        
      if (paysError) console.error("Payment Fetch Error:", paysError);
      setPayments(pays || []);

      const { data: banks } = await supabase.from("accounts").select("id, name").eq("business_id", bId).eq("type", "asset");
      setBankAccounts(banks || []);
    }
    fetchData();
  }, [params.id]);

  if (!invoice) return <div className="p-12 text-center animate-pulse text-neutral-500">Loading Enterprise A/R Data...</div>;

  const totalDue = Number(invoice.total_amount);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const remainingBalance = Math.max(0, totalDue - totalPaid);
  const isFullyPaid = remainingBalance === 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, ''); 
    if (!value) {
      setDisplayAmount('');
      setRawAmount(0);
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setRawAmount(num);
      setDisplayAmount(num.toLocaleString('en-US')); 
    } else {
      setDisplayAmount(value);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
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
                  
                  {isFullyPaid ? (
                    <span className="bg-green-100 text-green-700 border border-green-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Fully Paid
                    </span>
                  ) : totalPaid > 0 ? (
                    <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Partially Paid
                    </span>
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
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full md:w-64 space-y-3">
                <div className="flex justify-between text-neutral-500 text-sm font-medium">
                  <span>Subtotal</span>
                  <span>₱{totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                {totalPaid > 0 && (
                  <div className="flex justify-between text-green-600 text-sm font-medium">
                    <span>Total Paid</span>
                    <span>- ₱{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-neutral-900 pt-3 text-lg font-black text-neutral-900">
                  <span>Balance Due</span>
                  <span>₱{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: THE A/R TRACKER */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-neutral-200">
            <CardHeader className="pb-4 border-b border-neutral-100">
              <CardTitle className="text-lg">Payment Tracker</CardTitle>
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
                        <p className="text-[10px] text-green-600 uppercase tracking-wider">CASH / BANK RECEIPT</p>
                      </div>
                      <p className="font-bold text-green-700">+₱{Number(payment.amount).toLocaleString('en-US')}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* THE NEW DYNAMIC SECURITY LOCK */}
          {!isFullyPaid && (
            <>
              {userRole === 'business_owner' || userRole === 'super_admin' || (userRole === 'staff' && allowStaffPayment) ? (
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
                      } catch (err: any) {
                        alert("SERVER ERROR: " + err.message);
                      }
                    }} className="space-y-4">
                      
                      <input type="hidden" name="invoice_id" value={invoice.id} />
                      <input type="hidden" name="client_name" value={invoice.client_name} />

                      <div className="space-y-2">
                        <Label htmlFor="amount_display">Amount Received (₱)</Label>
                        <Input 
                          id="amount_display" 
                          type="text" 
                          placeholder="e.g. 10,000"
                          value={displayAmount}
                          onChange={handleAmountChange}
                          required 
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="date">Date Received</Label>
                        <Input id="date" name="date" type="date" defaultValue="" required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="account_id">Deposited To (Bank)</Label>
                        <Select name="account_id" required>
                          <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <SubmitButton title="Apply Payment" loadingTitle="Processing..." className="w-full bg-blue-600 hover:bg-blue-700 text-white" />
                    </form>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-sm border-neutral-200 bg-neutral-50">
                  <CardContent className="p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center mx-auto mb-2 text-xl shadow-inner border border-neutral-300">
                      🔒
                    </div>
                    <p className="font-semibold text-neutral-900 text-lg">Payment Logging Disabled</p>
                    <p className="text-sm text-neutral-500 leading-relaxed">
                      The business owner has restricted staff from manually logging payments. Please contact management to record receipts for this invoice.
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