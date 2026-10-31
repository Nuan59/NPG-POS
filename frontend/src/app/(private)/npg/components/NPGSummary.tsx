// NPGSummary.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/npg/components/NPGSummary.tsx
import {
  Users,
  TrendingUp,
  AlertCircle,
  AlertOctagon,
  Landmark,
  Wallet,
  PiggyBank,
  ShieldAlert,
} from "lucide-react";

// ✅ ยอดรวมทุกบัญชี - คำนวณฝั่ง client จาก metrics ของแต่ละบัญชี (page.tsx)
export interface NPGPortfolioSummary {
  total_accounts: number;
  active_accounts: number;
  overdue_accounts: number;
  bad_debt_accounts: number;
  credit: number;
  expected_total: number;
  paid: number;
  principal_paid: number;
  interest_received: number;
  outstanding: number;
  fees_received: number;
  realized_profit: number;
  bad_debt: number;
}

interface NPGSummaryProps {
  summary: NPGPortfolioSummary;
  userRole?: string;
  // ✅ กดการ์ด "กำลังชำระ" / "เกินกำหนด" เพื่อกรองตาราง (ไม่ส่งมาก็ใช้ได้เหมือนเดิม)
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
}

const baht = (n: number) => `฿${Math.round(Number(n) || 0).toLocaleString("th-TH")}`;

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.min(Math.max((part / whole) * 100, 0), 100) : 0;

// ---------- การ์ดจำนวนบัญชี ----------
interface CountCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  tone: "navy" | "green" | "red" | "rose";
  alert?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const toneStyle = {
  navy: "text-[#1e2432] bg-slate-100",
  green: "text-emerald-700 bg-emerald-50",
  red: "text-red-600 bg-red-100",
  rose: "text-rose-700 bg-rose-100",
};

const CountCard = ({ title, value, icon: Icon, tone, alert, selected, onClick }: CountCardProps) => {
  const base = "rounded-xl border p-4 flex items-center justify-between gap-3 text-left transition-all";
  const color = alert
    ? tone === "rose"
      ? "border-rose-300 bg-rose-50"
      : "border-red-300 bg-red-50"
    : "border-slate-200 bg-white";
  const interactive = onClick ? "hover:border-[#F26B1D] cursor-pointer" : "";
  const ring = selected ? "ring-2 ring-[#F26B1D] ring-offset-1" : "";
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-xs md:text-sm text-[#7A7A7A]">{title}</p>
        <p
          className={`text-2xl md:text-3xl font-bold mt-0.5 tabular-nums ${
            alert ? (tone === "rose" ? "text-rose-700" : "text-red-600") : "text-[#1e2432]"
          }`}
        >
          {Number(value || 0).toLocaleString()}
        </p>
      </div>
      <div className={`p-2.5 rounded-xl shrink-0 ${toneStyle[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={`${base} ${color} ${interactive} ${ring}`}>
      {content}
    </button>
  ) : (
    <div className={`${base} ${color}`}>{content}</div>
  );
};

// ---------- แถวตัวเลขในกลุ่มการเงิน ----------
const Row = ({
  label,
  value,
  strong,
  className = "",
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) => (
  <div className="flex items-baseline justify-between gap-3 py-1">
    <span className="text-sm text-[#7A7A7A]">{label}</span>
    <span className={`tabular-nums ${strong ? "text-base font-bold" : "font-semibold"} ${className}`}>
      {value}
    </span>
  </div>
);

const Group = ({
  title,
  icon: Icon,
  iconClass,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconClass: string;
  children: React.ReactNode;
}) => (
  <div className="border-t border-slate-100 pt-3">
    <div className="flex items-center gap-2 mb-1">
      <div className={`p-1 rounded-md ${iconClass}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <h3 className="text-sm font-semibold text-[#7A7A7A]">{title}</h3>
    </div>
    {children}
  </div>
);

export default function NPGSummary({
  summary,
  userRole,
  statusFilter,
  onStatusFilterChange,
}: NPGSummaryProps) {
  // 🔒 adm/admin/administrator เท่านั้น (เหมือนเดิม)
  const isAdmin =
    !!userRole && ["adm", "admin", "administrator"].includes(userRole.toLowerCase());

  const collectedPct = pct(summary.paid, summary.expected_total);
  const badDebtPct = pct(summary.bad_debt, summary.outstanding);

  // กดการ์ดซ้ำ = ยกเลิกตัวกรอง
  const toggle = (key: string) =>
    onStatusFilterChange
      ? () => onStatusFilterChange(statusFilter === key ? "all" : key)
      : undefined;

  return (
    <div className="space-y-4">
      {/* ✅ จำนวนบัญชี - พนักงานเห็น 3 ใบ, 🔒 admin เห็นเพิ่ม "หนี้เสีย" */}
      <div className={`grid grid-cols-2 gap-3 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <CountCard
          title="ลูกค้าทั้งหมด"
          value={summary.total_accounts}
          icon={Users}
          tone="navy"
          selected={statusFilter === "all" && !!onStatusFilterChange}
          onClick={onStatusFilterChange ? () => onStatusFilterChange("all") : undefined}
        />
        <CountCard
          title="กำลังชำระ"
          value={summary.active_accounts}
          icon={TrendingUp}
          tone="green"
          selected={statusFilter === "active"}
          onClick={toggle("active")}
        />
        <CountCard
          title="เกินกำหนดชำระ"
          value={summary.overdue_accounts}
          icon={AlertCircle}
          tone="red"
          alert={summary.overdue_accounts > 0}
          selected={statusFilter === "overdue"}
          onClick={toggle("overdue")}
        />
        {isAdmin && (
          <CountCard
            title="หนี้เสีย (เกิน 90 วัน)"
            value={summary.bad_debt_accounts}
            icon={AlertOctagon}
            tone="rose"
            alert={summary.bad_debt_accounts > 0}
          />
        )}
      </div>

      {/* 🔒 ภาพรวมการเงิน - เฉพาะ admin */}
      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-[#7A7A7A]">เก็บเงินได้แล้ว</p>
              <p className="text-2xl font-bold tabular-nums text-[#1e2432]">
                {baht(summary.paid)}
                <span className="text-base font-normal text-[#7A7A7A]"> / {baht(summary.expected_total)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#7A7A7A]">คงค้างอีก</p>
              <p className="text-lg font-bold tabular-nums text-amber-600">{baht(summary.outstanding)}</p>
            </div>
          </div>
          <div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${collectedPct}%` }}
              />
            </div>
            <p className="text-xs text-[#7A7A7A] mt-1 tabular-nums">
              {collectedPct.toFixed(1)}% ของยอดทั้งสัญญา
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-3">
            <Group title="สินเชื่อ" icon={Landmark} iconClass="bg-orange-50 text-[#F26B1D]">
              <Row label="สินเชื่อรวม (เงินต้น)" value={baht(summary.credit)} />
              <Row label="ยอดชำระคาดการณ์" value={baht(summary.expected_total)} />
              <Row
                label="ดอกเบี้ยทั้งสัญญา"
                value={baht(summary.expected_total - summary.credit)}
                className="text-[#7A7A7A]"
              />
            </Group>

            <Group title="การรับชำระ" icon={Wallet} iconClass="bg-slate-100 text-[#1e2432]">
              <Row label="ชำระแล้ว" value={baht(summary.paid)} className="text-emerald-600" />
              <Row label="เงินต้นชำระแล้ว" value={baht(summary.principal_paid)} />
              <Row label="ยอดคงค้าง" value={baht(summary.outstanding)} className="text-amber-600" />
            </Group>

            <Group title="รายได้" icon={PiggyBank} iconClass="bg-emerald-50 text-emerald-600">
              <Row label="ดอกเบี้ยรับ" value={baht(summary.interest_received)} />
              <Row label="ค่าธรรมเนียมรับแล้ว" value={baht(summary.fees_received)} />
              <div className="border-t border-dashed border-slate-200 mt-1 pt-1">
                <Row
                  label="กำไรรับจริง"
                  value={baht(summary.realized_profit)}
                  strong
                  className="text-emerald-600"
                />
              </div>
            </Group>

            <Group title="ความเสี่ยง" icon={ShieldAlert} iconClass="bg-rose-50 text-rose-700">
              <Row
                label="หนี้เสียคาดการณ์"
                value={baht(summary.bad_debt)}
                strong
                className={summary.bad_debt > 0 ? "text-rose-700" : ""}
              />
              <Row label="จำนวนบัญชี" value={`${summary.bad_debt_accounts} บัญชี`} />
              <div className="mt-1.5">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-600" style={{ width: `${badDebtPct}%` }} />
                </div>
                <p className="text-xs text-[#7A7A7A] mt-1 tabular-nums">
                  {badDebtPct.toFixed(1)}% ของยอดคงค้าง
                </p>
              </div>
            </Group>
          </div>
        </div>
      )}
    </div>
  );
}