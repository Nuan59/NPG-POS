import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

interface NPGSummaryProps {
  summary: {
    total_accounts: number;
    active_accounts: number;
    total_finance_amount: number;
    total_paid: number;
    total_remaining: number;
    overdue_accounts: number;
  };
  userRole?: string; // เพิ่ม userRole
}

export default function NPGSummary({ summary, userRole }: NPGSummaryProps) {
  // ✅ Debug: ดู role ที่ได้จริง
  console.log("🔍 NPGSummary userRole:", userRole);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const cards = [
    {
      title: "ลูกค้าทั้งหมด",
      value: summary.total_accounts.toString(),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      showForNonAdmin: true, // ✅ แสดงให้ทุกคน
    },
    {
      title: "กำลังชำระ",
      value: summary.active_accounts.toString(),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      showForNonAdmin: true, // ✅ แสดงให้ทุกคน
    },
    {
      title: "ยอดจัดรวม",
      value: formatCurrency(summary.total_finance_amount),
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      showForNonAdmin: false, // ❌ แสดงเฉพาะ admin
    },
    {
      title: "ยอดชำระแล้ว",
      value: formatCurrency(summary.total_paid),
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      showForNonAdmin: false, // ❌ แสดงเฉพาะ admin
    },
  ];

  // ✅ เช็คว่าเป็น admin หรือไม่ (adm, admin, administrator)
  const isAdmin = userRole && (
    userRole.toLowerCase() === "adm" || 
    userRole.toLowerCase() === "admin" ||
    userRole.toLowerCase() === "administrator"
  );
  
  console.log("🔍 isAdmin:", isAdmin);
  
  // ถ้าไม่ใช่ admin ให้กรองเอาเฉพาะการ์ดที่ showForNonAdmin: true
  const filteredCards = isAdmin
    ? cards  // admin เห็นทุกการ์ด
    : cards.filter(card => card.showForNonAdmin);  // พนักงานเห็นเฉพาะบางการ์ด

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {filteredCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}