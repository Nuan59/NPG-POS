// NPGSummary.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/npg/components/NPGSummary.tsx
import { Card, CardContent } from "@/components/ui/card";
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
}

const baht = (n: number) =>
  `฿${Math.round(n || 0).toLocaleString("th-TH")}`;

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.min(Math.max((part / whole) * 100, 0), 100) : 0;

// ---------- การ์ดจำนวนบัญชี ----------
interface CountCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  tone: "blue" | "green" | "red" | "rose";
  alert?: boolean;
}

const toneStyle = {
  blue: { bar: "bg-blue-500", icon: "text-blue-600 bg-blue-50" },
  green: { bar: "bg-emerald-500", icon: "text-emerald-600 bg-emerald-50" },
  red: { bar: "bg-red-500", icon: "text-red-600 bg-red-50" },
  rose: { bar: "bg-rose-700", icon: "text-rose-700 bg-rose-50" },
};

const CountCard = ({ title, value, icon: Icon, tone, alert }: CountCardProps) => {
  const t = toneStyle[tone];
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute left-0 top-0 h-full w-1 ${alert ? t.bar : "bg-slate-200"}`} />
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${alert ? "text-red-600" : "text-slate-900"}`}>
            {value.toLocaleString()}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${t.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
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
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`tabular-nums ${strong ? "text-lg font-bold" : "font-semibold"} ${className}`}>
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
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
      <div className={`p-1.5 rounded-lg ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
    </div>
    {children}
  </div>
);

export default function NPGSummary({ summary, userRole }: NPGSummaryProps) {
  const isAdmin =
    !!userRole && ["adm", "admin", "administrator"].includes(userRole.toLowerCase());

  const collectedPct = pct(summary.paid, summary.expected_total);
  const badDebtPct = pct(summary.bad_debt, summary.outstanding);

  return (
    <div className="space-y-4">
      {/* ✅ จำนวนบัญชี - พนักงานเห็น 3 ใบ, admin เห็นเพิ่ม "หนี้เสีย" */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <CountCard title="ลูกค้าทั้งหมด" value={summary.total_accounts} icon={Users} tone="blue" />
        <CountCard title="กำลังชำระ" value={summary.active_accounts} icon={TrendingUp} tone="green" />
        <CountCard
          title="เกินกำหนดชำระ"
          value={summary.overdue_accounts}
          icon={AlertCircle}
          tone="red"
          alert={summary.overdue_accounts > 0}
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

      {/* ❌ ภาพรวมการเงิน - เฉพาะ admin */}
      {isAdmin && (
        <Card>
          <CardContent className="p-5 space-y-5">
            {/* ความคืบหน้าการเก็บเงิน */}
            <div>
              <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm text-slate-500">เก็บเงินได้แล้ว</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {baht(summary.paid)}
                    <span className="text-base font-normal text-slate-400">
                      {" "}/ {baht(summary.expected_total)}
                    </span>
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  {collectedPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${collectedPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                คงค้างอีก {baht(summary.outstanding)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Group title="สินเชื่อ" icon={Landmark} iconClass="bg-orange-50 text-orange-600">
                <Row label="สินเชื่อรวม (เงินต้น)" value={baht(summary.credit)} />
                <Row label="ยอดชำระคาดการณ์" value={baht(summary.expected_total)} />
                <Row
                  label="ดอกเบี้ยทั้งสัญญา"
                  value={baht(summary.expected_total - summary.credit)}
                  className="text-slate-500"
                />
              </Group>

              <Group title="การรับชำระ" icon={Wallet} iconClass="bg-blue-50 text-blue-600">
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
                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-rose-600" style={{ width: `${badDebtPct}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {badDebtPct.toFixed(1)}% ของยอดคงค้าง
                  </p>
                </div>
              </Group>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}