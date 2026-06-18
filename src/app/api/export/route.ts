// src/app/api/export/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // 1. Get Business ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single();

  const businessId = profile?.business_id;

  // 2. FETCH EXPENSES (Disambiguating the Foreign Keys!)
  const { data: expenses } = await supabase
    .from("expenses")
    .select(`
      date,
      description,
      amount,
      bank:accounts!expenses_account_id_fkey(name),
      category:accounts!expenses_category_id_fkey(name)
    `)
    .eq("business_id", businessId);

  // 3. FETCH INCOME
  const { data: income } = await supabase
    .from("income")
    .select(`
      date,
      description,
      amount,
      bank:accounts!income_account_id_fkey(name),
      category:accounts!income_category_id_fkey(name)
    `)
    .eq("business_id", businessId);

  // 4. MERGE & SORT INTO A UNIFIED LEDGER
  const allTransactions = [
    ...(income || []).map(i => ({ ...i, type: "Income" })),
    ...(expenses || []).map(e => ({ ...e, type: "Expense" }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

  // 5. BUILD THE CSV STRING
  const csvHeaders = "Date,Type,Description,Category,Bank Account,Amount\n";
  
  const csvRows = allTransactions.map(t => {
    // Escape quotes and commas for Excel safety
    const safeDesc = `"${(t.description || "").replace(/"/g, '""')}"`;
    const bankName = `"${(t.bank as any)?.name || "Unknown"}"`;
    const categoryName = `"${(t.category as any)?.name || "Uncategorized"}"`;
    
    // Expenses are negative, Income is positive
    const safeAmount = t.type === "Expense" ? `-${t.amount}` : `${t.amount}`;

    return `${t.date},${t.type},${safeDesc},${categoryName},${bankName},${safeAmount}`;
  });

  const csvContent = csvHeaders + csvRows.join("\n");

  // 6. FORCE BROWSER DOWNLOAD
  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="MDS_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv"`,
    }
  });
}