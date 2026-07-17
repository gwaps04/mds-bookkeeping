// src/features/payroll/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logSecurityEvent } from "@/lib/audit";
import { verifyActiveSubscription } from "@/lib/subscription";

// Upgraded Fallback Config to 2026 Standards including ER Rates
const FALLBACK_CONFIG = {
  sss_min_msc: 5000, sss_max_msc: 35000, sss_ee_rate: 0.05, sss_er_rate: 0.10,
  phic_min_salary: 10000, phic_max_salary: 100000, phic_ee_rate: 0.025, phic_er_rate: 0.025,
  hdmf_max_salary: 10000, hdmf_ee_rate: 0.02, hdmf_er_rate: 0.02
};

// ============================================================================
// BIR TRAIN LAW TAX CALCULATOR (2023-2026 Rates)
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
// 2. GENERATE NEW PAYROLL RUN (WITH EE/ER ENGINE & EXCLUSION FILTER)
// ============================================================================
export async function createPayrollRun(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("business_id").eq("id", user.id).single();
  const businessId = profile?.business_id;

  const { data: configData } = await supabase.from("statutory_config").select("*").order("effective_year", { ascending: false }).limit(1);
  const config = configData?.[0] || FALLBACK_CONFIG;

  const excludedStr = formData.get("excluded_employees") as string;
  const excludedIds: string[] = excludedStr ? JSON.parse(excludedStr) : [];

  const { data: allActiveEmployees } = await supabase.from("employees").select("*").eq("business_id", businessId).eq("is_active", true);
  
  const employees = (allActiveEmployees || []).filter(emp => !excludedIds.includes(emp.id));

  // The Zero-Payload Guard
  if (!employees || employees.length === 0) {
    throw new Error("You must include at least one active employee to generate a payroll draft.");
  }

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
    let sss_er = 0, phic_er = 0, hdmf_er = 0;
    let monthlyGross = grossPay;
    
    if (emp.pay_schedule === 'SEMI_MONTHLY') monthlyGross = grossPay * 2;
    if (emp.pay_schedule === 'WEEKLY') monthlyGross = grossPay * 4;

    if (emp.sss_enabled && grossPay > 0) {
      let msc = Math.round(monthlyGross / 500) * 500;
      msc = Math.max(config.sss_min_msc, Math.min(msc, config.sss_max_msc));
      sss = msc * config.sss_ee_rate;
      sss_er = msc * config.sss_er_rate; 
    }
    if (emp.philhealth_enabled && grossPay > 0) {
      const phicBase = Math.max(config.phic_min_salary, Math.min(monthlyGross, config.phic_max_salary));
      phic = phicBase * config.phic_ee_rate;
      phic_er = phicBase * config.phic_er_rate;
    }
    if (emp.pagibig_enabled && grossPay > 0) {
      const hdmfBase = Math.min(monthlyGross, config.hdmf_max_salary);
      hdmf = hdmfBase * config.hdmf_ee_rate;
      hdmf_er = hdmfBase * config.hdmf_er_rate;
    }

    if (emp.pay_schedule === 'SEMI_MONTHLY') { sss /= 2; phic /= 2; hdmf /= 2; sss_er /= 2; phic_er /= 2; hdmf_er /= 2; }
    if (emp.pay_schedule === 'WEEKLY') { sss /= 4; phic /= 4; hdmf /= 4; sss_er /= 4; phic_er /= 4; hdmf_er /= 4; }

    sss = Math.round(sss * 100) / 100;
    phic = Math.round(phic * 100) / 100;
    hdmf = Math.round(hdmf * 100) / 100;
    sss_er = Math.round(sss_er * 100) / 100;
    phic_er = Math.round(phic_er * 100) / 100;
    hdmf_er = Math.round(hdmf_er * 100) / 100;

    if (emp.tax_enabled && grossPay > 0) {
      const taxableIncome = grossPay - (sss + phic + hdmf);
      tax = calculateWithholdingTax(taxableIncome, emp.pay_schedule);
    }

    const netPay = Math.round((grossPay - (sss + phic + hdmf + tax)) * 100) / 100;
    const totalErLiability = Math.round((sss_er + phic_er + hdmf_er) * 100) / 100;

    return {
      payroll_run_id: run!.id, employee_id: emp.id, business_id: businessId,
      gross_pay: grossPay, net_pay: netPay, 
      hours_worked: 0, overtime_hours: 0, commission_earned: 0,
      breakdown: { 
        sss, phic, hdmf, tax, ot_pay: 0, 
        sss_er, phic_er, hdmf_er, total_er_liability: totalErLiability 
      }
    };
  });

  await supabase.from("payslips").insert(draftPayslips);
  revalidatePath("/payroll");
  redirect(`/payroll/${run!.id}`);
}

// ============================================================================
// 3. SAVE DRAFT (WITH EE/ER ENGINE & OVERRIDES)
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
    let sss_er = 0, phic_er = 0, hdmf_er = 0;
    let monthlyGross = newGross;

    if (emp.pay_schedule === 'SEMI_MONTHLY') monthlyGross = newGross * 2;
    if (emp.pay_schedule === 'WEEKLY') monthlyGross = newGross * 4;

    if (emp.sss_enabled && newGross > 0) {
      let msc = Math.round(monthlyGross / 500) * 500;
      msc = Math.max(config.sss_min_msc, Math.min(msc, config.sss_max_msc));
      sss = msc * config.sss_ee_rate;
      sss_er = msc * config.sss_er_rate;
    }
    if (emp.philhealth_enabled && newGross > 0) {
      const phicBase = Math.max(config.phic_min_salary, Math.min(monthlyGross, config.phic_max_salary));
      phic = phicBase * config.phic_ee_rate;
      phic_er = phicBase * config.phic_er_rate;
    }
    if (emp.pagibig_enabled && newGross > 0) {
      const hdmfBase = Math.min(monthlyGross, config.hdmf_max_salary);
      hdmf = hdmfBase * config.hdmf_ee_rate;
      hdmf_er = hdmfBase * config.hdmf_er_rate;
    }

    if (emp.pay_schedule === 'SEMI_MONTHLY') { sss /= 2; phic /= 2; hdmf /= 2; sss_er /= 2; phic_er /= 2; hdmf_er /= 2; }
    if (emp.pay_schedule === 'WEEKLY') { sss /= 4; phic /= 4; hdmf /= 4; sss_er /= 4; phic_er /= 4; hdmf_er /= 4; }

    sss = Math.round(sss * 100) / 100;
    phic = Math.round(phic * 100) / 100;
    hdmf = Math.round(hdmf * 100) / 100;
    sss_er = Math.round(sss_er * 100) / 100;
    phic_er = Math.round(phic_er * 100) / 100;
    hdmf_er = Math.round(hdmf_er * 100) / 100;

    if (emp.tax_enabled && newGross > 0) {
      const taxableIncome = newGross - (sss + phic + hdmf);
      tax = calculateWithholdingTax(taxableIncome, emp.pay_schedule);
    }

    const netPay = Math.round((newGross - (sss + phic + hdmf + tax)) * 100) / 100;
    const totalErLiability = Math.round((sss_er + phic_er + hdmf_er) * 100) / 100;

    return {
      id: slip.id, payroll_run_id: runId, employee_id: slip.employee_id, business_id: slip.business_id, 
      hours_worked: hoursWorked, overtime_hours: otHours, commission_earned: commEarned,
      gross_pay: newGross, net_pay: netPay, 
      breakdown: { 
        sss, phic, hdmf, tax, ot_pay: otPay,
        sss_er, phic_er, hdmf_er, total_er_liability: totalErLiability 
      }, 
      updated_at: new Date().toISOString()
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

  const { data: payslips } = await supabase.from("payslips").select("gross_pay, breakdown").eq("payroll_run_id", runId);
  
  let totalGross = 0;
  let totalERLiability = 0;

  (payslips || []).forEach(slip => {
    totalGross += Number(slip.gross_pay);
    const bd = slip.breakdown as any;
    if (bd && bd.total_er_liability) {
      totalERLiability += Number(bd.total_er_liability);
    }
  });

  const totalEmploymentCost = Math.round((totalGross + totalERLiability) * 100) / 100;

  let { data: category } = await supabase
    .from("accounts")
    .select("id")
    .eq("business_id", businessId)
    .eq("name", "Salaries & Wages")
    .single();

  let categoryId = category?.id;

  if (!categoryId) {
    const { data: newCat } = await supabase
      .from("accounts")
      .insert([{ business_id: businessId, name: "Salaries & Wages", type: "expense", category: "Payroll" }])
      .select("id")
      .single();
    categoryId = newCat?.id;
  }

  const { error: expError } = await supabase.from("expenses").insert([{
    business_id: businessId,
    account_id: accountId,
    category_id: categoryId,
    amount: totalEmploymentCost,
    date: new Date().toISOString().split('T')[0],
    description: `Payroll Cycle (${runId.split('-')[0]}) - Includes ₱${totalERLiability.toLocaleString('en-US', {minimumFractionDigits: 2})} in Employer Statutory Liabilities`,
    status: 'paid',
    created_by: user.id
  }]);

  if (expError) throw new Error("Failed to post expense to ledger: " + expError.message);

  const { error: runError } = await supabase
    .from("payroll_runs")
    .update({ status: 'PAID', updated_at: new Date().toISOString() })
    .eq("id", runId);

  if (runError) throw new Error("Failed to mark payroll as paid.");

  await logSecurityEvent({
    businessId: businessId as string, actorId: user.id, action: "DISBURSED_PAYROLL", tableName: "payroll_runs", recordId: runId, 
    details: { total_gross: totalGross, total_er_liability: totalERLiability, account_id: accountId }
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${runId}`);
  revalidatePath("/expenses");
}

// ============================================================================
// 6. GENERATE 13TH MONTH PAY (DOLE COMPLIANT & EXCLUSION FILTER)
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

  const excludedStr = formData.get("excluded_employees") as string;
  const excludedIds: string[] = excludedStr ? JSON.parse(excludedStr) : [];

  const { data: allActiveEmployees } = await supabase.from("employees").select("*").eq("business_id", businessId).eq("is_active", true);
  
  const employees = (allActiveEmployees || []).filter(emp => !excludedIds.includes(emp.id));

  // The Zero-Payload Guard
  if (!employees || employees.length === 0) {
    throw new Error("You must include at least one active employee to generate a 13th month draft.");
  }

  const { data: run } = await supabase.from("payroll_runs").insert([{
    business_id: businessId, 
    period_start: `${targetYear}-01-01`, 
    period_end: `${targetYear}-12-31`, 
    run_date: runDate, 
    status: 'DRAFT',
    run_type: '13TH_MONTH', 
    created_by: user.id
  }]).select("id").single();

  const draftPayslips = employees.map(emp => {
    let monthlyBase = 0;

    const base = Number(emp.base_rate);
    if (emp.pay_type === 'FIXED_SALARY') {
      if (emp.pay_schedule === 'SEMI_MONTHLY') monthlyBase = base * 2;
      else if (emp.pay_schedule === 'WEEKLY') monthlyBase = base * 4;
      else monthlyBase = base;
    } else if (emp.pay_type === 'HOURLY') {
      monthlyBase = (base * 8) * 22; 
    } else {
      monthlyBase = base; 
    }

    const hireDate = new Date(emp.date_hired);
    let monthsWorked = 12;
    if (hireDate.getFullYear() === targetYear) {
      monthsWorked = 12 - hireDate.getMonth();
    } else if (hireDate.getFullYear() > targetYear) {
      monthsWorked = 0; 
    }

    let total13th = (monthlyBase * monthsWorked) / 12;
    total13th = Math.round(total13th * 100) / 100;

    return {
      payroll_run_id: run!.id, employee_id: emp.id, business_id: businessId,
      gross_pay: total13th, net_pay: total13th, 
      hours_worked: 0, overtime_hours: 0, commission_earned: 0,
      breakdown: { 
        sss: 0, phic: 0, hdmf: 0, tax: 0, ot_pay: 0, 
        sss_er: 0, phic_er: 0, hdmf_er: 0, total_er_liability: 0,
        is_13th_month: true 
      }
    };
  });

  await supabase.from("payslips").insert(draftPayslips);
  revalidatePath("/payroll");
  redirect(`/payroll/${run!.id}`);
}

// ============================================================================
// 7. UNLOCK PAYROLL (REVERT TO DRAFT)
// ============================================================================
export async function revertPayrollToDraft(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const runId = formData.get("run_id") as string;

  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", runId)
    .single();

  if (run?.status === 'PAID') {
    throw new Error("Critical Error: Cannot unlock a payroll cycle that has already been disbursed and posted to the ledger.");
  }

  const { error } = await supabase
    .from("payroll_runs")
    .update({ status: 'DRAFT', updated_at: new Date().toISOString() })
    .eq("id", runId);

  if (error) throw new Error(error.message);
  
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${runId}`);
}

// ============================================================================
// 8. UPDATE PAYROLL CYCLE DATES (THE MISSING FUNCTION RESTORED!)
// ============================================================================
export async function updatePayrollCycleDates(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const runId = formData.get("run_id") as string;
  const periodStart = formData.get("period_start") as string;
  const periodEnd = formData.get("period_end") as string;
  const runDate = formData.get("run_date") as string;

  // SECURITY GUARD: Fetch current status
  const { data: run } = await supabase
    .from("payroll_runs")
    .select("status")
    .eq("id", runId)
    .single();

  // STATE MACHINE CONSTRAINT: Only allow edits if it is a DRAFT
  if (run?.status !== 'DRAFT') {
    throw new Error("Security Lock: You cannot modify the dates of a payroll cycle that has already been finalized or disbursed.");
  }

  // Execute the update
  const { error } = await supabase
    .from("payroll_runs")
    .update({ 
      period_start: periodStart, 
      period_end: periodEnd, 
      run_date: runDate,
      updated_at: new Date().toISOString()
    })
    .eq("id", runId);

  if (error) throw new Error(error.message);
  
  // Revalidate both the specific review page and the main hub
  revalidatePath(`/payroll/${runId}`);
  revalidatePath("/payroll");
}