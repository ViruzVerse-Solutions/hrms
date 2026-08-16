import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateInput: string | Date | undefined | null, shortYear = false): string {
  if (!dateInput) return "—";
  try {
    let d: Date;
    if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      const [year, month, day] = dateInput.trim().split("-").map(Number);
      d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      d = new Date(dateInput);
    }
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: shortYear ? "2-digit" : "numeric",
    });
  } catch {
    return String(dateInput);
  }
}

export function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

export function formatTime(dateInput: string | Date | undefined | null, includeSeconds = false): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      ...(includeSeconds && { second: "2-digit" }),
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Standard Indian CTC Breakup Calculator
 * Basic = 40% of CTC
 * HRA = 50% of Basic
 * Conveyance & Medical = Fixed
 * PF Employee = 12% of Basic (capped at ₹1800/mo or standard)
 * ESI Employee = 0.75% of Gross if Gross <= ₹21,000
 * Professional Tax = Standard slab (~₹200/mo)
 */
export function calculateSalaryBreakup(annualCtc: number) {
  const monthlyCtc = Math.round(annualCtc / 12);
  const basic = Math.round(monthlyCtc * 0.40);
  const hra = Math.round(basic * 0.50);
  const conveyance = 1600;
  const medicalAllowance = 1250;
  
  const initialSpecial = monthlyCtc - (basic + hra + conveyance + medicalAllowance);
  const specialAllowance = Math.max(0, initialSpecial);
  
  const grossEarnings = basic + hra + specialAllowance + conveyance + medicalAllowance;
  
  // Deductions
  const pfEmployee = Math.min(1800, Math.round(basic * 0.12));
  const pfEmployer = pfEmployee;
  
  const esiEmployee = grossEarnings <= 21000 ? Math.round(grossEarnings * 0.0075) : 0;
  const esiEmployer = grossEarnings <= 21000 ? Math.round(grossEarnings * 0.0325) : 0;
  
  const professionalTax = grossEarnings > 15000 ? 200 : 0;
  
  // Simplified estimated TDS bracket
  let tds = 0;
  if (annualCtc > 1200000) {
    tds = Math.round((grossEarnings * 0.15));
  } else if (annualCtc > 750000) {
    tds = Math.round((grossEarnings * 0.07));
  }
  
  const totalDeductions = pfEmployee + esiEmployee + professionalTax + tds;
  const netPay = grossEarnings - totalDeductions;
  
  return {
    basic,
    hra,
    specialAllowance,
    conveyance,
    medicalAllowance,
    grossEarnings,
    pfEmployee,
    esiEmployee,
    professionalTax,
    tds,
    totalDeductions,
    netPay,
    pfEmployer,
    esiEmployer,
    ctcMonthly: monthlyCtc,
    ctcAnnual: annualCtc,
  };
}

export function getStatusColorBadge(status: string): { bg: string; text: string; border: string } {
  switch (status.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'selected':
    case 'cleared':
    case 'resolved':
    case 'present':
    case 'paid':
    case 'completed':
      return { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-600', border: 'border-emerald-500/20' };
    case 'pending':
    case 'pending_approval':
    case 'under_review':
    case 'in_progress':
    case 'probation':
    case 'notice_period':
    case 'half_day':
    case 'ongoing':
      return { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', text: 'text-amber-600', border: 'border-amber-500/20' };
    case 'rejected':
    case 'terminated':
    case 'suspended':
    case 'critical':
    case 'absent':
    case 'severe':
      return { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', text: 'text-rose-600', border: 'border-rose-500/20' };
    case 'draft':
    case 'upcoming':
    case 'applied':
      return { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', text: 'text-blue-600', border: 'border-blue-500/20' };
    default:
      return { bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', text: 'text-slate-600', border: 'border-slate-500/20' };
  }
}
