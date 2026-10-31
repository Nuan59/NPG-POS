"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, ChevronRight } from "lucide-react";
import type { NPGAccount } from "../page";

interface NPGTableProps {
  accounts: NPGAccount[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  periodFilter: string;
  onPeriodFilterChange: (value: string) => void;
  onRefresh: () => void;
  refreshing?: boolean;
  hideStatusFilter?: boolean; // ✅ ซ่อนตัวกรองสถานะ (ใช้กับตารางบัญชีที่ปิดแล้วซึ่ง status ตายตัวอยู่แล้ว)
  hideToolbar?: boolean; // ✅ ซ่อนแถบค้นหาทั้งแถบ (ตารางบัญชีที่ปิดแล้วใช้ช่องค้นหาเดียวกับตารางบน)
  embedded?: boolean; // ✅ ไม่ใส่กรอบการ์ด (ใช้ตอนซ้อนอยู่ในกล่องอื่น)
  title?: string; // ✅ หัวข้อ (ค่า default: "รายการลูกค้า NPG")
  isAdmin?: boolean; // 🔒 ป้าย "หนี้เสีย" แสดงเฉพาะ admin
  statusCounts?: { all: number; active: number; overdue: number };
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    Number(amount) || 0
  );

// ✅ แปลงวันที่แบบปลอดภัย - "YYYY-MM-DD" ตีความเป็นวันที่ท้องถิ่น (ไม่เลื่อนวันจาก timezone) และไม่ขึ้น Invalid Date
const parseDate = (s?: string | null): Date | null => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (s?: string | null) => {
  const d = parseDate(s);
  return d ? d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "—";
};

const daysFromToday = (s?: string | null): number | null => {
  const d = parseDate(s);
  if (!d) return null;
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day.getTime() - today.getTime()) / 86400000);
};

const PILL = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-blue-50 text-blue-700",
  closed: "bg-slate-100 text-slate-600",
  overdue: "bg-red-100 text-red-700",
  bad_debt: "bg-rose-700 text-white",
};

const STATUS_LABEL: Record<string, string> = {
  active: "กำลังชำระ",
  completed: "ชำระครบ",
  closed: "ปิดบัญชี",
  overdue: "เกินกำหนด",
  bad_debt: "หนี้เสีย",
};

const PERIOD_STYLE: Record<string, string> = {
  รายเดือน: "bg-purple-50 text-purple-700",
  รายวัน: "bg-sky-50 text-sky-700",
  รายสัปดาห์: "bg-teal-50 text-teal-700",
};

export default function NPGTable({
  accounts,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  periodFilter,
  onPeriodFilterChange,
  onRefresh,
  refreshing = false,
  hideStatusFilter = false,
  hideToolbar = false,
  embedded = false,
  title = "รายการลูกค้า NPG",
  isAdmin = false,
  statusCounts,
}: NPGTableProps) {
  const router = useRouter();

  // ✅ ใช้ is_overdue (คำนวณสดจากวันที่จริงฝั่ง backend) แทนการเชื่อ status ที่อาจยังไม่ถูกอัปเดต
  const isOverdueOf = (a: NPGAccount) => a.status === "overdue" || a.is_overdue === true;

  // 🔒 หนี้เสีย (เกิน 90 วัน) แสดงเฉพาะ admin - พนักงานเห็นเป็น "เกินกำหนด"
  const statusKeyOf = (a: NPGAccount) =>
    isAdmin && a.metrics?.contract_status === "bad_debt"
      ? "bad_debt"
      : isOverdueOf(a)
      ? "overdue"
      : a.status;

  // ✅ ใช้ค่าจริงจาก Order.npg_period ก่อนเสมอถ้ามี (แม่นกว่า) ไม่มีค่อย fallback ไป period_type เดิม
  const periodOf = (a: NPGAccount) => a.order_npg_period || a.period_type;

  const StatusBadges = ({ account }: { account: NPGAccount }) => {
    const key = statusKeyOf(account);
    const days = Number(account.metrics?.days_overdue || 0);
    return (
      <div className="flex flex-col items-start gap-1">
        <span className={`${PILL} ${STATUS_STYLE[key] || STATUS_STYLE.closed}`}>
          {STATUS_LABEL[key] || key}
        </span>
        {isOverdueOf(account) && days > 0 && (
          <span className="text-[11px] text-red-600 font-medium">เกิน {days} วัน</span>
        )}
        {/* ✅ ป้าย "ผ่อนดาวน์" แยกต่างหาก - บอกด้วยว่าตัวรถผ่อนกับไฟแนนซ์เจ้าไหน (ถ้ามี) */}
        {account.account_type === "down_payment" && (
          <span className={`${PILL} bg-amber-100 text-amber-800 text-[10px]`}>
            ผ่อนดาวน์{account.order_payment_method ? ` (${account.order_payment_method})` : ""}
          </span>
        )}
      </div>
    );
  };

  const DueDate = ({ account }: { account: NPGAccount }) => {
    if (!account.next_payment_date || account.status === "closed" || account.status === "completed") {
      return <span className="text-sm text-[#7A7A7A]">{formatDate(account.next_payment_date)}</span>;
    }
    const diff = daysFromToday(account.next_payment_date);
    const late = isOverdueOf(account) || (diff !== null && diff < 0);
    return (
      <div className="text-sm tabular-nums">
        <div className={late ? "text-red-600 font-semibold" : "text-[#1e2432]"}>
          {formatDate(account.next_payment_date)}
        </div>
        {diff !== null && (
          <div
            className={`text-xs ${
              diff < 0 ? "text-red-600" : diff === 0 ? "text-[#F26B1D] font-semibold" : "text-[#7A7A7A]"
            }`}
          >
            {diff < 0 ? `เลยมา ${-diff} วัน` : diff === 0 ? "ครบวันนี้" : `อีก ${diff} วัน`}
          </div>
        )}
      </div>
    );
  };

  const Progress = ({ account, compact }: { account: NPGAccount; compact?: boolean }) => {
    const p = Math.min(Math.max(Number(account.progress_percentage) || 0, 0), 100);
    const done = account.status === "closed" || account.status === "completed";
    return (
      <div className={compact ? "" : "min-w-[110px]"}>
        {!compact && (
          <div className="flex justify-between text-xs text-[#7A7A7A] mb-1 tabular-nums">
            <span>
              {account.paid_count}/{account.installment_count} งวด
            </span>
            <span>{p.toFixed(0)}%</span>
          </div>
        )}
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-[#F26B1D]"}`}
            style={{ width: `${p}%` }}
          />
        </div>
      </div>
    );
  };

  const chips: { key: string; label: string; count?: number; red?: boolean }[] = [
    { key: "all", label: "ทั้งหมด", count: statusCounts?.all },
    { key: "active", label: "กำลังชำระ", count: statusCounts?.active },
    { key: "overdue", label: "เกินกำหนด", count: statusCounts?.overdue, red: true },
  ];

  const toolbar = !hideToolbar && (
    <div className="flex flex-col gap-3 p-4 border-b">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[#1e2432]">{title}</h2>
        {!hideStatusFilter && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => {
              const on = statusFilter === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onStatusFilterChange(c.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                    on
                      ? c.red
                        ? "bg-red-600 border-red-600 text-white"
                        : "bg-[#1e2432] border-[#1e2432] text-white"
                      : "bg-white border-slate-200 text-[#1e2432] hover:bg-slate-50"
                  }`}
                >
                  {c.label}
                  {typeof c.count === "number" && (
                    <span
                      className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                        on ? "bg-white/20" : "bg-slate-100 text-[#7A7A7A]"
                      }`}
                    >
                      {c.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A] h-4 w-4" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาชื่อ เบอร์โทร หรือรุ่นรถ..."
            className="pl-9"
          />
        </div>

        <Select value={periodFilter} onValueChange={onPeriodFilterChange}>
          <SelectTrigger className="w-[130px] shrink-0">
            <SelectValue placeholder="ประเภท" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกประเภท</SelectItem>
            <SelectItem value="รายวัน">รายวัน</SelectItem>
            <SelectItem value="รายสัปดาห์">รายสัปดาห์</SelectItem>
            <SelectItem value="รายเดือน">รายเดือน</SelectItem>
            <SelectItem value="รายปี">รายปี</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={onRefresh}
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={refreshing}
          aria-label="รีเฟรช"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );

  const body =
    accounts.length === 0 ? (
      <div className="text-center py-12 text-[#7A7A7A]">ไม่พบข้อมูลลูกค้า NPG</div>
    ) : (
      <>
        {/* ---------- จอใหญ่: ตาราง ---------- */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-[#7A7A7A]">
                <th className="text-left px-4 py-2.5 font-semibold">ลูกค้า</th>
                <th className="text-left p-2.5 font-semibold">รถ</th>
                <th className="text-right p-2.5 font-semibold">ยอดจัด</th>
                <th className="text-right p-2.5 font-semibold">งวดต่อไป</th>
                <th className="text-right p-2.5 font-semibold">คงเหลือ</th>
                <th className="text-left p-2.5 font-semibold">ความคืบหน้า</th>
                <th className="text-left p-2.5 font-semibold">วันครบชำระ</th>
                <th className="text-left p-2.5 font-semibold">ประเภท</th>
                <th className="text-left p-2.5 font-semibold">สถานะ</th>
                <th className="p-2.5" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const isOverdue = isOverdueOf(account);
                const late = Number(account.estimated_late_fee || 0);
                const period = periodOf(account);
                return (
                  <tr
                    key={account.id}
                    onClick={() => router.push(`/npg/${account.id}`)}
                    className={`border-b last:border-b-0 cursor-pointer transition-colors ${
                      isOverdue ? "bg-red-50/60 hover:bg-red-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className={`px-4 py-3 ${isOverdue ? "shadow-[inset_3px_0_0_#dc2626]" : ""}`}>
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-sm font-semibold text-white ${
                            isOverdue ? "bg-red-600" : "bg-[#1e2432]"
                          }`}
                        >
                          {(account.customer_name || "?").trim().charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1e2432] truncate">{account.customer_name}</div>
                          <div className="text-xs text-[#7A7A7A] tabular-nums">{account.customer_phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5 text-sm">
                      {account.bike_info ? (
                        <>
                          <div className="font-medium">{account.bike_info.brand}</div>
                          <div className="text-[#7A7A7A]">{account.bike_info.model_name}</div>
                        </>
                      ) : (
                        <span className="text-[#7A7A7A]">—</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right tabular-nums font-semibold">
                      ฿{formatCurrency(account.finance_amount)}
                    </td>
                    <td className="p-2.5 text-right tabular-nums">
                      <span className="text-emerald-600 font-semibold">
                        ฿{formatCurrency(Number(account.installment_amount || 0) + late)}
                      </span>
                      {late > 0 && (
                        <div className="text-xs text-red-500 font-medium mt-0.5">
                          (รวมค่าปรับ ฿{formatCurrency(late)})
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 text-right tabular-nums">
                      <span className={isOverdue ? "text-red-600 font-bold" : "text-[#1e2432] font-semibold"}>
                        ฿{formatCurrency(account.remaining_balance)}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <Progress account={account} />
                    </td>
                    <td className="p-2.5">
                      <DueDate account={account} />
                    </td>
                    <td className="p-2.5">
                      <span className={`${PILL} ${PERIOD_STYLE[period] || "bg-orange-50 text-[#F26B1D]"}`}>
                        {period}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <StatusBadges account={account} />
                    </td>
                    <td className="p-2.5 pr-4">
                      <Link
                        href={`/npg/${account.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-sm text-[#7A7A7A] hover:text-[#F26B1D] whitespace-nowrap"
                      >
                        ดู
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ---------- มือถือ: การ์ด ---------- */}
        <div className="md:hidden divide-y">
          {accounts.map((account) => {
            const isOverdue = isOverdueOf(account);
            return (
              <Link
                key={account.id}
                href={`/npg/${account.id}`}
                className={`block px-4 py-3 space-y-2 ${
                  isOverdue ? "bg-red-50/60 shadow-[inset_3px_0_0_#dc2626]" : "active:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-sm font-semibold text-white ${
                        isOverdue ? "bg-red-600" : "bg-[#1e2432]"
                      }`}
                    >
                      {(account.customer_name || "?").trim().charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1e2432] truncate">{account.customer_name}</div>
                      <div className="text-xs text-[#7A7A7A] truncate">
                        {account.bike_info
                          ? `${account.bike_info.brand} ${account.bike_info.model_name}`
                          : account.customer_phone}
                      </div>
                    </div>
                  </div>
                  <StatusBadges account={account} />
                </div>
                <div className="flex justify-between text-sm tabular-nums">
                  <span className="text-[#7A7A7A]">คงเหลือ</span>
                  <span className={isOverdue ? "text-red-600 font-bold" : "font-semibold"}>
                    ฿{formatCurrency(account.remaining_balance)}
                  </span>
                </div>
                <Progress account={account} compact />
                <div className="flex justify-between text-xs text-[#7A7A7A] tabular-nums">
                  <span>
                    {account.paid_count}/{account.installment_count} งวด · {periodOf(account)}
                  </span>
                  <span className={isOverdue ? "text-red-600 font-semibold" : ""}>
                    {account.next_payment_date ? `ครบ ${formatDate(account.next_payment_date)}` : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </>
    );

  if (embedded) {
    return (
      <div>
        {toolbar}
        {body}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      {toolbar}
      {body}
    </div>
  );
}