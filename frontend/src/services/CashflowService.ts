"use server";
import { authorizedFetch } from "@/util/AuthorizedFetch";
import { revalidatePath, revalidateTag } from "next/cache";

// ================== TYPES ==================

export interface CashflowRow {
  id?: number;
  description: string;
  income: number;
  sent: number;
  expense: number;
  change: number;
  depositReturn: number;
  createdBy?: string;   // ชื่อพนักงานที่บันทึกรายการนี้
  balance?: number;
}

export interface CashflowTotals {
  income: number;
  sent: number;
  expense: number;
  change: number;
  deposit_return: number;
}

export interface CashflowSectionData {
  opening: number;
  openingOverride: number | null;
  rows: CashflowRow[];
  totals: CashflowTotals;
  closing: number;
}

export interface CashflowDayData {
  date: string;
  cash: CashflowSectionData;
  transfer: CashflowSectionData;
  checkerName: string;
  checkerDate: string | null;
}

export interface CashflowMonthDay {
  date: string;
  cashClosing: number;
  transferClosing: number;
}

export interface CashflowMonthData {
  month: string;
  cashTotals: CashflowTotals;
  transferTotals: CashflowTotals;
  cashClosing: number;
  transferClosing: number;
  days: CashflowMonthDay[];
}

export interface CashflowTodaySummary {
  date: string;
  cashClosing: number;
  transferClosing: number;
}

export interface CashflowSaveDayPayload {
  date: string;
  cashRows: CashflowRow[];
  transferRows: CashflowRow[];
  cashOpeningOverride?: string | number;
  transferOpeningOverride?: string | number;
  checkerName?: string;
  checkerDate?: string;
}

// ================== API CALLS ==================

export const getCashflowDay = async (date: string): Promise<CashflowDayData | null> => {
  "use server";
  const response = await authorizedFetch(
    `${process.env.API_URL}/cashflow/day/?date=${date}`,
    { next: { tags: ["cashflowDay", date], revalidate: 0 } }
  );
  if (!response?.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const saveCashflowDay = async (payload: CashflowSaveDayPayload) => {
  "use server";
  const response = await authorizedFetch(`${process.env.API_URL}/cashflow/save_day/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let status = "error";
  if (response?.status === 200) {
    revalidatePath("/cashflow");
    revalidateTag("cashflowDay");
    status = "success";
  }
  return { status, data: response?.json() };
};

export const getCashflowMonth = async (month: string): Promise<CashflowMonthData | null> => {
  "use server";
  const response = await authorizedFetch(
    `${process.env.API_URL}/cashflow/month/?month=${month}`,
    { next: { revalidate: 0 } }
  );
  if (!response?.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const getCashflowTodaySummary = async (): Promise<CashflowTodaySummary | null> => {
  "use server";
  const response = await authorizedFetch(
    `${process.env.API_URL}/cashflow/today-summary/`,
    { next: { revalidate: 0, tags: ["cashflowTodaySummary"] } }
  );
  if (!response?.ok) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
};
