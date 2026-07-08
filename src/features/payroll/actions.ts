// src/features/payroll/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/audit";
import { verifyActiveSubscription } from "@/lib/subscription";

const FALLBACK_CONFIG = {
  sss_min_msc: 4000, sss_max_msc: 30000, sss_ee_rate: 0.045,
  phic_min_salary: 10000, phic_max_salary: 100000, phic_ee_rate: 0.025,
  hdmf_max_salary: 10000, hdmf_ee_rate: 0.02
};

// ============================================================================
// NEW: BIR TRAIN LAW TAX CALCULATOR (2023-2024+ Rates)
// ============================================================================
function calculateWithholdingTax(taxableIncome: number, schedule: string): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;

  if (schedule === 'SEMI_MONTHLY') {
    if (taxableIncome <= 10417) tax = 0;
    else if (taxableIncome <= 16667) tax = (taxableIncome - 10417) * 0.15;
    else if (taxableIncome <= 33333) tax = 937.50 + (taxableIncome - 16667) * 0.20;
    else if (taxableIncome <= 83333) tax = 4270.83 + (taxableIncome - 33333) * 0.25;
    else if (taxableIncome <= 333333) tax = 16770.83 + (taxableIncome - 83333) * 0.30;
    else tax = 91770.83 + (taxableIncome - 333333) * 0.35;
  } 
  else if (schedule === 'WEEKLY') {
    if (taxableIncome <= 4808) tax = 0;
    else if (taxableIncome <= 7692) tax = (taxableIncome - 4808) * 0.15;
    else if (taxableIncome <= 15385) tax = 432.60 + (taxableIncome - 7692) * 0.20;
    else if (taxableIncome <= 38462) tax = 1971.20 + (taxableIncome - 15385) * 0.25;
    else if (taxableIncome <= 153846) tax = 7740.45 + (taxableIncome - 38462) * 0.30;
    else tax = 42355.65 + (taxableIncome - 153846) * 0.35;
  } 
  else { // MONTHLY
    if (taxableIncome <= 20833) tax = 0;
    else if (taxableIncome <= 33333) tax = (taxableIncome - 20833) * 0.15;
    else if (taxableIncome <= 66667) tax = 1875.00 + (taxableIncome - 33333) * 0.20;
    else if (taxableIncome <= 166667) tax = 8541.67 + (taxableIncome - 66667) * 0.25;
    else if (taxableIncome <= 666667) tax = 33541.67 + (taxableIncome - 166667) * 0.30;
    else tax = 183541.67 + (taxableIncome - 666667) * 0.35;
  }

  return Math.round(tax * 100) / 100;
}

// ============================================================================
// 1. EMPLOYEE CRUD OPERATIONS
// ============================================================================
export async function createEmployee(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await verifyActiveSubscription(user.id);

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  const baseRate = parseFloat(formData.get("base_rate") as string);
  if (isNaN(baseRate) || baseRate < 0) throw new Error("Base rate must be positive.");

  const { error } = await supabase.from("employees").insert([{
    business_id: businessId, 
    first_name: formData.get("first_name"), 
    last_name: formData.get("last_name"), 
    position: formData.get("position"), 
    date_hired: formData.get("date_hired"),
    pay_type: formData.get("pay_type"), 
    pay_schedule: formData.get("pay_schedule"), 
    base_rate: baseRate,
    sss_enabled: formData.get("sss_enabled") === "on", 
    philhealth_enabled: formData.get("philhealth_enabled") === "on", 
    pagibig_enabled: formData.get("pagibig_enabled") === "on", 
    tax_enabled: formData.get("tax_enabled") === "on", 
    is_active: true
  }]);

  if (error) throw new Error(error.message);
  revalidatePath("/payroll/employees");
}

export async function updateEmployee(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const empId = formData.get("id") as string;
  const baseRate = parseFloat(formData.get("base_rate") as string);
  
  const { error } = await supabase.from("employees").update({
    first_name: formData.get("first_name"), 
    last_name: formData.get("last_name"), 
    position: formData.get("position"), 
    date_hired: formData.get("date_hired"),
    pay_type: formData.get("pay_type"), 
    pay_schedule: formData.get("pay_schedule"), 
    base_rate: baseRate,
    sss_enabled: formData.get("sss_enabled") === "on", 
    philhealth_enabled: formData.get("philhealth_enabled") === "on", 
    pagibig_enabled: formData.get("pagibig_enabled") === "on", 
    tax_enabled: formData.get("tax_enabled") === "on",
    updated_at: new Date().toISOString()
  }).eq("id", empId);

  if (error) throw new Error(error.message);
  revalidatePath("/payroll/employees");
}

export async function deleteEmployee(formData: FormData) {
  const supabase = await createClient();
  const empId = formData.get("id") as string;
  const { error } = await supabase.from("employees").update({ is_active: false }).eq("id", empId);
  if (error) throw new Error(error.message);
  revalidatePath("/payroll/employees");
}

// ============================================================================
// 2. GENERATE NEW PAYROLL RUN (WITH TAX ENGINE)
// ============================================================================
export async function createPayrollRun(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  const { data: configData } = await supabase.from("statutory_config").select("*").order("effective_year", { ascending: false }).limit(1);
  const config = configData?.[0] || FALLBACK_CONFIG;

  const { data: employees } = await supabase.from("employees").select("*").eq("business_id", businessId).eq("is_active", true);
  if (!employees || employees.length === 0) throw new Error("No active employees found.");

  const { data: run } = await supabase.from("payroll_runs").insert([{
    business_id: businessId, 
    period_start: formData.get("period_start"), 
    period_end: formData.get("period_end"), 
    run_date: formData.get("run_date"), 
    status: 'DRAFT', 
    created_by: user.id
  }]).select("id").single();

  const draftPayslips = employees.map(emp => {
    let grossPay = 0.00;

    if (emp.pay_type === 'FIXED_SALARY') {
      const base = Number(emp.base_rate);
      if (emp.pay_schedule === 'SEMI_MONTHLY') grossPay = base / 2;
      else if (emp.pay_schedule === 'WEEKLY') grossPay = base / 4;
      else grossPay = base; 
    }
    grossPay = Math.round(grossPay * 100) / 100;

    let sss = 0, phic = 0, hdmf = 0, tax = 0;
    let monthlyGross = grossPay;
    if (emp.pay_schedule === 'SEMI_MONTHLY') monthlyGross = grossPay * 2;
    if (emp.pay_schedule === 'WEEKLY') monthlyGross = grossPay * 4;

    if (emp.sss_enabled && grossPay > 0) {
      let msc = Math.round(monthlyGross / 500) * 500;
      msc = Math.max(config.sss_min_msc, Math.min(msc, config.sss_max_msc));
      sss = msc * config.sss_ee_rate;
    }
    if (emp.philhealth_enabled && grossPay > 0) {
      phic = Math.max(config.phic_min_salary, Math.min(monthlyGross, config.phic_max_salary)) * config.phic_ee_rate;
    }
    if (emp.pagibig_enabled && grossPay > 0) {
      hdmf = Math.min(monthlyGross, config.hdmf_max_salary) * config.hdmf_ee_rate;
    }

    if (emp.pay_schedule === 'SEMI_MONTHLY') { sss /= 2; phic /= 2; hdmf /= 2; }
    if (emp.pay_schedule === 'WEEKLY') { sss /= 4; phic /= 4; hdmf /= 4; }

    sss = Math.round(sss * 100) / 100;
    phic = Math.round(phic * 100) / 100;
    hdmf = Math.round(hdmf * 100) / 100;

    // Phase 2.5: Taxable Income = Gross - (SSS + PHIC + HDMF)
    if (emp.tax_enabled && grossPay > 0) {
      const taxableIncome = grossPay - (sss + phic + hdmf);
      tax = calculateWithholdingTax(taxableIncome, emp.pay_schedule);
    }

    const netPay = Math.round((grossPay - (sss + phic + hdmf + tax)) * 100) / 100;

    return {
      payroll_run_id: run!.id, employee_id: emp.id, business_id: businessId,
      gross_pay: grossPay, net_pay: netPay, 
      hours_worked: 0, overtime_hours: 0, commission_earned: 0,
      breakdown: { sss, phic, hdmf, tax, ot_pay: 0 }
    };
  });

  await supabase.from("payslips").insert(draftPayslips);
  revalidatePath("/payroll");
  redirect(`/payroll/${run!.id}`);
}

// ============================================================================
// 3. SAVE DRAFT (WITH TAX ENGINE)
// ============================================================================
export async function saveDraftPayslips(formData: FormData) {
  const supabase = await createClient();
  const runId = formData.get("run_id") as string;
  
  const { data: configData } = await supabase.from("statutory_config").select("*").order("effective_year", { ascending: false }).limit(1);
  const config = configData?.[0] || FALLBACK_CONFIG;

  const { data: payslips } = await supabase.from("payslips").select("id, employee_id, business_id, employees!inner(*)").eq("payroll_run_id", runId);

  const updates = payslips!.map((slip) => {
    const emp = slip.employees as any;
    const baseRate = Number(emp.base_rate);
    
    const hoursWorked = parseFloat(formData.get(`hours_worked_${slip.id}`) as string) || 0;
    const otHours = parseFloat(formData.get(`overtime_hours_${slip.id}`) as string) || 0;
    const commEarned = parseFloat(formData.get(`commission_earned_${slip.id}`) as string) || 0;

    let newGross = 0.00;
    let hourlyRate = 0.00;

    if (emp.pay_type === 'FIXED_SALARY') {
      if (emp.pay_schedule === 'SEMI_MONTHLY') newGross = baseRate / 2;
      else if (emp.pay_schedule === 'WEEKLY') newGross = baseRate / 4;
      else newGross = baseRate;
      hourlyRate = (baseRate / 22) / 8; 
    } else if (emp.pay_type === 'HOURLY') {
      newGross = baseRate * hoursWorked;
      hourlyRate = baseRate;
    } else if (emp.pay_type === 'COMMISSION') {
      newGross = baseRate + commEarned;
    }

    const otPay = Math.round((hourlyRate * 1.25 * otHours) * 100) / 100;
    newGross += otPay;
    newGross = Math.round(newGross * 100) / 100;

    let sss = 0, phic = 0, hdmf = 0, tax = 0;
    let monthlyGross = newGross;
    if (emp.pay_schedule === 'SEMI_MONTHLY') monthlyGross = newGross * 2;
    if (emp.pay_schedule === 'WEEKLY') monthlyGross = newGross * 4;

    if (emp.sss_enabled && newGross > 0) {
      let msc = Math.round(monthlyGross / 500) * 500;
      msc = Math.max(config.sss_min_msc, Math.min(msc, config.sss_max_msc));
      sss = msc * config.sss_ee_rate;
    }
    if (emp.philhealth_enabled && newGross > 0) {
      phic = Math.max(config.phic_min_salary, Math.min(monthlyGross, config.phic_max_salary)) * config.phic_ee_rate;
    }
    if (emp.pagibig_enabled && newGross > 0) {
      hdmf = Math.min(monthlyGross, config.hdmf_max_salary) * config.hdmf_ee_rate;
    }

    if (emp.pay_schedule === 'SEMI_MONTHLY') { sss /= 2; phic /= 2; hdmf /= 2; }
    if (emp.pay_schedule === 'WEEKLY') { sss /= 4; phic /= 4; hdmf /= 4; }

    sss = Math.round(sss * 100) / 100;
    phic = Math.round(phic * 100) / 100;
    hdmf = Math.round(hdmf * 100) / 100;

    // Phase 2.5: Taxable Income = Gross - (SSS + PHIC + HDMF)
    if (emp.tax_enabled && newGross > 0) {
      const taxableIncome = newGross - (sss + phic + hdmf);
      tax = calculateWithholdingTax(taxableIncome, emp.pay_schedule);
    }

    const netPay = Math.round((newGross - (sss + phic + hdmf + tax)) * 100) / 100;

    return {
      id: slip.id, payroll_run_id: runId, employee_id: slip.employee_id, business_id: slip.business_id, 
      hours_worked: hoursWorked, overtime_hours: otHours, commission_earned: commEarned,
      gross_pay: newGross, net_pay: netPay, 
      breakdown: { sss, phic, hdmf, tax, ot_pay: otPay }, updated_at: new Date().toISOString()
    };
  });

  await supabase.from("payslips").upsert(updates, { onConflict: 'id' });
  revalidatePath(`/payroll/${runId}`);
}

// ============================================================================
// 4. FINALIZE PAYROLL RUN
// ============================================================================
export async function finalizePayrollRun(formData: FormData) {
  const supabase = await createClient();
  const runId = formData.get("run_id") as string;
  await supabase.from("payroll_runs").update({ status: 'FINALIZED', updated_at: new Date().toISOString() }).eq("id", runId);
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${runId}`);
}

// ============================================================================
// 5. AUTO-POST TO EXPENSES (DISBURSE FUNDS)
// ============================================================================
export async function disbursePayrollRun(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await verifyActiveSubscription(user.id);

  const runId = formData.get("run_id") as string;
  const accountId = formData.get("account_id") as string;

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  // 1. Calculate Total Gross Pay from this cycle
  const { data: payslips } = await supabase.from("payslips").select("gross_pay").eq("payroll_run_id", runId);
  const totalGross = (payslips || []).reduce((sum, slip) => sum + Number(slip.gross_pay), 0);

  // 2. Find the "Salaries & Wages" category in their Chart of Accounts
  let { data: category } = await supabase
    .from("accounts")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", "Salaries & Wages")
    .single();

  let categoryId = category?.id;

  // Failsafe: If they accidentally deleted the category, recreate it instantly
  if (!categoryId) {
    const { data: newCat } = await supabase
      .from("accounts")
      .insert([{ business_id: businessId, name: "Salaries & Wages", type: "expense", category: "Payroll" }])
      .select("id")
      .single();
    categoryId = newCat?.id;
  }

  // 3. Inject the Double-Entry Record into the Expenses Table
  const { error: expError } = await supabase.from("expenses").insert([{
    business_id: businessId,
    account_id: accountId,
    category_id: categoryId,
    amount: totalGross,
    date: new Date().toISOString().split('T')[0],
    description: `Automated Payroll Disbursement (Cycle ID: ${runId.split('-')[0]})`,
    status: 'paid',
    created_by: user.id
  }]);

  if (expError) throw new Error("Failed to post expense to ledger: " + expError.message);

  // 4. Lock the Payroll Run
  const { error: runError } = await supabase
    .from("payroll_runs")
    .update({ status: 'PAID', updated_at: new Date().toISOString() })
    .eq("id", runId);

  if (runError) throw new Error("Failed to mark payroll as paid.");

  await logSecurityEvent({
    businessId: businessId as string, actorId: user.id, action: "DISBURSED_PAYROLL", tableName: "payroll_runs", recordId: runId, details: { total_gross: totalGross, account_id: accountId }
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${runId}`);
  revalidatePath("/expenses");
}

// ============================================================================
// 6. GENERATE 13TH MONTH PAY (DOLE COMPLIANT)
// ============================================================================
export async function create13thMonthRun(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await verifyActiveSubscription(user.id);

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  const targetYear = parseInt(formData.get("year") as string);
  const runDate = formData.get("run_date") as string;

  const { data: employees } = await supabase.from("employees").select("*").eq("business_id", businessId).eq("is_active", true);
  if (!employees || employees.length === 0) throw new Error("No active employees found.");

  // 1. Create the specialized 13th Month Run
  const { data: run } = await supabase.from("payroll_runs").insert([{
    business_id: businessId, 
    period_start: `${targetYear}-01-01`, 
    period_end: `${targetYear}-12-31`, 
    run_date: runDate, 
    status: 'DRAFT',
    run_type: '13TH_MONTH', // Flags this to bypass standard UI deductions
    created_by: user.id
  }]).select("id").single();

  const draftPayslips = employees.map(emp => {
    let monthlyBase = 0;

    // Normalize their pay to a Monthly equivalent
    const base = Number(emp.base_rate);
    if (emp.pay_type === 'FIXED_SALARY') {
      if (emp.pay_schedule === 'SEMI_MONTHLY') monthlyBase = base * 2;
      else if (emp.pay_schedule === 'WEEKLY') monthlyBase = base * 4;
      else monthlyBase = base;
    } else if (emp.pay_type === 'HOURLY') {
      monthlyBase = (base * 8) * 22; // Est. 22 work days
    } else {
      monthlyBase = base; // Commission fallback
    }

    // DOLE Proration Logic: How many months did they work this year?
    const hireDate = new Date(emp.date_hired);
    let monthsWorked = 12;
    if (hireDate.getFullYear() === targetYear) {
      monthsWorked = 12 - hireDate.getMonth();
    } else if (hireDate.getFullYear() > targetYear) {
      monthsWorked = 0; // Hired after the target year
    }

    // The 13th Month Formula
    let total13th = (monthlyBase * monthsWorked) / 12;
    total13th = Math.round(total13th * 100) / 100;

    return {
      payroll_run_id: run!.id, employee_id: emp.id, business_id: businessId,
      gross_pay: total13th, net_pay: total13th, // ZERO DEDUCTIONS ON 13TH MONTH!
      hours_worked: 0, overtime_hours: 0, commission_earned: 0,
      breakdown: { sss: 0, phic: 0, hdmf: 0, tax: 0, ot_pay: 0, is_13th_month: true }
    };
  });

  await supabase.from("payslips").insert(draftPayslips);
  revalidatePath("/payroll");
  redirect(`/payroll/${run!.id}`);
}