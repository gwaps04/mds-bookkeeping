// src/app/(dashboard)/invoices/page.tsx
import { createClient } from "@/lib/supabase/server";
import { deleteOfficialInvoice } from "@/features/invoices/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmDeleteForm from "@/components/ConfirmDeleteForm";

export default async function InvoicesPage(props: { searchParams: Promise<{ search?: string, status?: string }> }) {
  const params = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase.from("profiles").select("business_id, role").eq("id", user?.id).single();
  const isOwner = profile?.role === 'business_owner' || profile?.role === 'super_admin';

  // 1. GET TODAY'S DATE FOR THE DETECTOR
  const today = new Date().toISOString().split('T')[0];

  // 2. BUILD SEARCH & FILTER QUERY
  let query = supabase
    .from("invoices")
    .select("*")
    .eq("business_id", profile?.business_id)
    .order("created_at", { ascending: false });

  if (params?.search) query = query.ilike("client_name", `%${params.search}%`);
  
  // 3. THE SMART STATUS FILTER
  if (params?.status && params?.status !== "all") {
    if (params.status === "overdue") {
      query = query.neq("status", "paid").neq("status", "cancelled").lt("due_date", today);
    } else {
      query = query.eq("status", params.status);
    }
  }

  const { data: fetchedInvoices } = await query;

  // 4. THE OVERDUE DETECTOR (ON-THE-FLY INTERCEPTOR)
  const invoices = (fetchedInvoices || []).map(inv => {
    const isOverdue = (inv.status !== 'paid' && inv.status !== 'cancelled') && (inv.due_date < today);
    return {
      ...inv,
      displayStatus: isOverdue ? 'overdue' : inv.status
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER & NEW BUTTON */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-neutral-900">Invoices</h2>
          <p className="text-neutral-500 mt-1">Manage and track your accounts receivable.</p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-blue-700 hover:bg-blue-800 text-white shadow-sm font-medium">+ Create Invoice</Button>
        </Link>
      </div>

      {/* SEARCH & FILTER BAR */}
      <Card className="shadow-sm border-neutral-200 bg-white">
        <CardContent className="p-4">
          <form method="GET" className="flex flex-col md:flex-row gap-3 items-end">
            <div className="flex-1 w-full space-y-1">
              <Label className="text-xs text-neutral-500">Search Client</Label>
              <Input name="search" placeholder="Search client name..." defaultValue={params?.search} />
            </div>
            <div className="w-full md:w-48 space-y-1">
              <Label className="text-xs text-neutral-500">Filter Status</Label>
              <Select name="status" defaultValue={params?.status || "all"}>
                <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button type="submit" className="bg-neutral-900 text-white">Filter</Button>
              {(params?.search || params?.status) && (
                <Link href="/invoices"><Button variant="outline" className="text-neutral-500">Clear</Button></Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* INVOICE LEDGER */}
      <Card className="shadow-sm border-neutral-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
              <thead className="bg-neutral-50 border-b border-t border-neutral-200">
                <tr>
                  <th className="px-6 py-3 font-medium text-neutral-900">Invoice ID</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Client</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Due Date</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Amount</th>
                  <th className="px-6 py-3 font-medium text-neutral-900">Status</th>
                  <th className="px-6 py-3 font-medium text-neutral-900 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {(!invoices || invoices.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-neutral-500">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className={`hover:bg-neutral-50 transition-colors ${inv.displayStatus === 'overdue' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4 font-mono text-xs text-neutral-500">
                        {inv.id.split('-')[0].toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-900">{inv.client_name}</td>
                      
                      <td className="px-6 py-4">
                        <span className={`text-sm ${inv.displayStatus === 'overdue' ? 'text-red-600 font-bold' : 'text-neutral-500'}`}>
                          {new Date(inv.due_date).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-bold text-neutral-900">
                        ₱{Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border 
                          ${inv.displayStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                            inv.displayStatus === 'partially_paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            inv.displayStatus === 'overdue' ? 'bg-red-100 text-red-800 border-red-300 animate-pulse' : 
                            'bg-neutral-100 text-neutral-800 border-neutral-200'}`}>
                          {inv.displayStatus.replace('_', ' ')}
                        </span>
                      </td>
                      
                      {/* ACTION BUTTONS (Cleanly wrapped inside one <td>) */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          <Link href={`/invoices/${inv.id}`}>
                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-neutral-700 hover:bg-neutral-100">View PDF</Button>
                          </Link>

                          <Link href={`/invoices/${inv.id}/edit`}>
                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-white text-blue-600 border-blue-200 hover:bg-blue-50">Edit</Button>
                          </Link>
                          
                          {/* THE COMPONENT DROP-IN */}
                          {isOwner && (
                            <ConfirmDeleteForm 
                              action={deleteOfficialInvoice} 
                              id={inv.id} 
                              itemName={`Invoice #${inv.id.split('-')[0].toUpperCase()}`} 
                            />
                          )}

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}