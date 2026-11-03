// employeeTypes.ts
// วางไฟล์นี้ใน: src/app/(private)/reports/util/employeeTypes.ts
// ✅ type ของรายงานพนักงาน (GET /reports/employees/) + ตัวช่วยแปลงช่วงเวลา ใช้ร่วมกันทั้งแท็บและหน้าพิมพ์
import { MONTHS } from "./index";

export interface EmployeeOpenTask {
  content: string;
  status: "pending" | "in_progress" | "issue" | "done";
  due_date: string | null;
  overdue: boolean;
  target_quantity: number | null;
  current_progress: number;
  target_unit: string;
  note: string;
}

export interface EmployeeNote {
  date: string;
  today: string;
  issue: string;
  tomorrow: string;
  checklist_ok: boolean;
}

export interface EmployeeLoginDay {
  date: string;
  first_in: string;
  last_out: string | null;
  sessions: number;
  no_logout: number;
}

export interface EmployeeRow {
  user_id: number;
  name: string;
  username: string;
  role: string;
  is_active: boolean;
  sales: { orders: number; bikes: number; amount: number; pending: number; checklist_incomplete: number };
  services: { count: number; amount: number; by_type: Record<string, number> };
  tasks: {
    total: number;
    done: number;
    on_time: number;
    late_done: number;
    overdue_open: number;
    in_progress: number;
    issue: number;
    pending: number;
    progress_avg_pct: number | null;
  };
  open_tasks: EmployeeOpenTask[];
  checkin_days: number;
  notes: EmployeeNote[];
  note_days: number;
  note_complete_days: number;
  login: { days: number; sessions: number; no_logout: number; avg_first_login: string | null };
  login_days: EmployeeLoginDay[];
  cash: {
    handovers: number;
    sent_total: number;
    received: number;
    mismatch: number;
    pending: number;
    diff_total: number;
    unsent_count: number;
    unsent_amount: number;
  };
  issues: { reported: number; assigned: number; resolved: number; open_assigned: number; avg_resolve_hours: number | null };
  expenses: { count: number; approved: number; approved_amount: number; rejected: number; pending: number };
}

export interface EmployeeReportData {
  start: string;
  end: string;
  employees: EmployeeRow[];
  warnings: string[];
}

export const TASK_STATUS_LABEL: Record<string, string> = {
  pending: "ยังไม่ทำ",
  in_progress: "กำลังทำ",
  issue: "ติดปัญหา",
  done: "ทำแล้ว",
};

// ---------- ช่วงเวลา ----------
export type PeriodMode = "month" | "year" | "range";

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** แปลงตัวเลือกเป็น start/end (YYYY-MM-DD) - month = 1..12 */
export const periodRange = (mode: PeriodMode, year: number, month: number, start: string, end: string) => {
  if (mode === "year") return { start: `${year}-01-01`, end: `${year}-12-31` };
  if (mode === "month") {
    const last = new Date(year, month, 0).getDate();
    return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(last)}` };
  }
  return { start, end };
};

/** ข้อความช่วงเวลาแบบไทย เช่น "พฤศจิกายน 2569" / "ปี 2569" / "1 พ.ย. 69 - 15 พ.ย. 69" */
export const periodLabel = (start: string, end: string) => {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sameYear = s.getFullYear() === e.getFullYear();
  if (sameYear && s.getMonth() === 0 && s.getDate() === 1 && e.getMonth() === 11 && e.getDate() === 31) {
    return `ปี ${s.getFullYear() + 543}`;
  }
  const lastOfMonth = new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();
  if (sameYear && s.getMonth() === e.getMonth() && s.getDate() === 1 && e.getDate() === lastOfMonth) {
    return `${MONTHS[s.getMonth()]} ${s.getFullYear() + 543}`;
  }
  const short = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  return start === end ? short(s) : `${short(s)} - ${short(e)}`;
};

export const thDate = (iso: string) =>
  new Date(iso.length <= 10 ? iso + "T00:00:00" : iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });

export const money = (n: number) => Math.round(n).toLocaleString("en-US");

/** % งานเสร็จตรงเวลา จากงานที่เสร็จแล้ว - ไม่มีงานเสร็จ = null */
export const onTimePct = (r: EmployeeRow) =>
  r.tasks.done > 0 ? Math.round((r.tasks.on_time / r.tasks.done) * 100) : null;

/** ดึงรายงานจาก backend ตรงๆ ด้วย token ของ session (ฝั่ง client) */
export const fetchEmployeeReport = async (token: string, start: string, end: string): Promise<EmployeeReportData> => {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${base}/reports/employees/?start=${start}&end=${end}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.error || `โหลดรายงานไม่สำเร็จ (${res.status})`);
  return data;
};