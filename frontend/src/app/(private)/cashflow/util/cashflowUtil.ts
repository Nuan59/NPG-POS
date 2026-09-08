// cashflowUtil.ts
// วางไฟล์นี้ใน: src/app/(private)/cashflow/util/cashflowUtil.ts
import { CashflowRow } from "@/services/CashflowService";

// ================== ประเภทรายการ ==================

export const TYPE_FIELDS = ["income", "sent", "expense", "change", "depositReturn", "cashIn"] as const;
export type RowType = (typeof TYPE_FIELDS)[number];

export const TYPE_LABEL: Record<RowType, string> = {
  income: "รายรับ",
  sent: "ส่งเงิน",
  expense: "รายจ่าย",
  change: "ทอนเงิน",
  depositReturn: "คืนมัดจำ",
  // ✅ เอาเงินเข้าลิ้นชัก (ยอดเพิ่มขึ้นเหมือนรายรับ) แต่ไม่ใช่รายได้จริง แยกจาก "รายรับ" เสมอ
  cashIn: "เปิดบิล",
};

export const TYPE_COLOR: Record<RowType, string> = {
  income: "text-emerald-700 bg-emerald-50 border-emerald-300",
  sent: "text-gray-700 bg-gray-50 border-gray-300",
  expense: "text-rose-700 bg-rose-50 border-rose-300",
  change: "text-sky-700 bg-sky-50 border-sky-300",
  depositReturn: "text-violet-700 bg-violet-50 border-violet-300",
  cashIn: "text-amber-700 bg-amber-50 border-amber-300",
};

// แถวหนึ่งใน UI จะมี field `type`/`amount` เพิ่มมา เพื่อรู้ว่าเงินก้อนนี้ผูกกับคอลัมน์ไหน (ไม่ส่งขึ้น backend ตรงๆ)
export type UIRow = CashflowRow & { type: RowType; amount: number };

export const ACCENT = {
  emerald: { title: "text-emerald-700", box: "bg-emerald-50 border-emerald-200", addBtn: "border-emerald-300 text-emerald-600 hover:bg-emerald-50" },
  sky: { title: "text-sky-700", box: "bg-sky-50 border-sky-200", addBtn: "border-sky-300 text-sky-600 hover:bg-sky-50" },
} as const;

export const inferType = (row: CashflowRow): RowType => {
  for (const f of TYPE_FIELDS) if (Number(row[f])) return f;
  return "income";
};

export const toUIRow = (row: CashflowRow, defaultCreatedBy: string): UIRow => {
  const type = inferType(row);
  return {
    ...row,
    type,
    amount: Number(row[type]) || 0,
    createdBy: row.createdBy || defaultCreatedBy,
  };
};

export const toApiRow = (row: UIRow): CashflowRow => {
  const base: CashflowRow = {
    description: row.description,
    income: 0, sent: 0, expense: 0, change: 0, depositReturn: 0, cashIn: 0,
    createdBy: row.createdBy,
  };
  base[row.type] = Number(row.amount) || 0;
  return base;
};

export const blankUIRow = (createdBy: string): UIRow => ({
  description: "", income: 0, sent: 0, expense: 0, change: 0, depositReturn: 0, cashIn: 0,
  type: "income", amount: 0, createdBy,
});

export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const fmt = (n: number | undefined | null) =>
  (Number(n) || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

export const shiftDate = (dateStr: string, days: number) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ✅ "เปิดบิล" บวกยอดคงเหลือเหมือน "รายรับ" (เงินเข้าลิ้นชักจริง) แต่แยกคอลัมน์กัน ไม่นับเป็นรายได้
export function signedAmount(row: UIRow) {
  const amt = Number(row.amount) || 0;
  return row.type === "income" || row.type === "cashIn" ? amt : -amt;
}

export function netOf(rows: UIRow[], opening: number) {
  let running = opening;
  rows.forEach((r) => { running += signedAmount(r); });
  return running;
}