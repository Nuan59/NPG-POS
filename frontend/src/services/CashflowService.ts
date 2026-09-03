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
  try {
    const response = await authorizedFetch(`${process.env.API_URL}/cashflow/save_day/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response) {
      console.error("❌ [saveCashflowDay] authorizedFetch คืนค่า null (ไม่มี session/token)");
      return { status: "error", data: null, error: "ไม่มี session หรือ token กรุณา login ใหม่" };
    }

    // ✅ อ่าน response แค่ครั้งเดียว แล้ว await .json() ให้ได้ข้อมูลจริง (เดิมส่ง Promise ที่ยังไม่ resolve กลับไป)
    const bodyText = await response.text();
    let bodyJson: any = null;
    try {
      bodyJson = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      bodyJson = null;
    }

    if (!response.ok) {
      console.error(`❌ [saveCashflowDay] HTTP ${response.status}:`, bodyText);
      return {
        status: "error",
        data: bodyJson,
        error: bodyJson?.error || bodyJson?.message || `HTTP ${response.status}: ${bodyText || response.statusText}`,
      };
    }

    revalidatePath("/cashflow");
    revalidateTag("cashflowDay");

    return { status: "success", data: bodyJson, error: undefined };
  } catch (err) {
    console.error("❌ [saveCashflowDay] เกิดข้อผิดพลาด:", err);
    return {
      status: "error",
      data: null,
      error: err instanceof Error ? err.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
    };
  }
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