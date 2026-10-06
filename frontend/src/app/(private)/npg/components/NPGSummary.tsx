import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  AlertCircle,
  AlertOctagon,
  Wallet,
  Target,
  CheckCircle,
  Landmark,
  Percent,
  Receipt,
  PiggyBank,
  Hourglass,
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

export default function NPGSummary({ summary, userRole }: NPGSummaryProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const isAdmin =
    !!userRole && ["adm", "admin", "administrator"].includes(userRole.toLowerCase());

  // ✅ การ์ดจำนวนบัญชี - พนักงานเห็นได้ (ใช้ติดตามลูกค้า)
  const countCards = [
    { title: "ลูกค้าทั้งหมด", value: summary.total_accounts, icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
    { title: "กำลังชำระ", value: summary.active_accounts, icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-50" },
    {
      title: "เกินกำหนดชำระ",
      value: summary.overdue_accounts,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      highlight: summary.overdue_accounts > 0,
    },
    {
      title: "หนี้เสีย (เกิน 90 วัน)",
      value: summary.bad_debt_accounts,
      icon: AlertOctagon,
      color: "text-rose-700",
      bgColor: "bg-rose-50",
      highlight: summary.bad_debt_accounts > 0,
    },
  ];

  // ❌ การ์ดตัวเงินภาพรวมธุรกิจ - เฉพาะ admin
  const moneyCards = [
    { title: "สินเชื่อรวม", value: summary.credit, icon: Landmark, color: "text-orange-600", bgColor: "bg-orange-50" },
    { title: "ยอดชำระคาดการณ์", value: summary.expected_total, icon: Target, color: "text-slate-600", bgColor: "bg-slate-100" },
    { title: "ชำระแล้ว", value: summary.paid, icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-50" },
    { title: "เงินต้นชำระแล้ว", value: summary.principal_paid, icon: Wallet, color: "text-blue-600", bgColor: "bg-blue-50" },
    { title: "ยอดคงค้าง", value: summary.outstanding, icon: Hourglass, color: "text-amber-600", bgColor: "bg-amber-50" },
    { title: "ดอกเบี้ยรับ", value: summary.interest_received, icon: Percent, color: "text-purple-600", bgColor: "bg-purple-50" },
    { title: "ค่าธรรมเนียมรับแล้ว", value: summary.fees_received, icon: Receipt, color: "text-cyan-600", bgColor: "bg-cyan-50" },
    { title: "กำไรรับจริง", value: summary.realized_profit, icon: PiggyBank, color: "text-emerald-600", bgColor: "bg-emerald-50" },
    {
      title: "หนี้เสียคาดการณ์",
      value: summary.bad_debt,
      icon: ShieldAlert,
      color: "text-rose-700",
      bgColor: "bg-rose-50",
      highlight: summary.bad_debt > 0,
    },
  ];

  const renderCard = (
    card: { title: string; icon: any; color: string; bgColor: string; highlight?: boolean },
    display: string,
    key: string
  ) => (
    <Card key={key} className={card.highlight ? "border-red-400 border-2" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
        <div className={`p-2 rounded-lg ${card.bgColor}`}>
          <card.icon className={`h-5 w-5 ${card.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${card.highlight ? "text-red-600" : ""}`}>{display}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {countCards.map((card) => renderCard(card, card.value.toString(), card.title))}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {moneyCards.map((card) => renderCard(card, formatCurrency(card.value), card.title))}
        </div>
      )}
    </div>
  );
}