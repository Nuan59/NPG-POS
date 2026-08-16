"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NPGSummary from "./components/NPGSummary";
import NPGTable from "./components/NPGTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Archive } from "lucide-react";

export interface NPGAccount {
  id: number;
  order_id: number;
  order_date: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  bike_info: {
    brand: string;
    model_name: string;
    model_code: string;
  } | null;
  status: "active" | "completed" | "closed" | "overdue";
  finance_amount: number;
  interest_rate: number;
  installment_count: number;
  installment_amount: number;
  period_type: "รายเดือน" | "รายปี";
  order_npg_period?: "รายเดือน" | "รายปี" | null;  // ✅ ค่าจริงจาก Order.npg_period (แม่นกว่า period_type เดิม)
  paid_count: number;
  total_paid: number;
  remaining_balance: number;
  start_date: string;
  next_payment_date: string;
  last_payment_date: string | null;
  progress_percentage: number;
  is_overdue: boolean;
  days_until_payment: number | null;
}

export interface NPGSummary {
  total_accounts: number;
  active_accounts: number;
  completed_accounts: number;
  closed_accounts: number;
  overdue_accounts: number;
  total_finance_amount: number;
  total_paid: number;
  total_remaining: number;
}

export default function NPGPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [accounts, setAccounts] = useState<NPGAccount[]>([]);
  const [summary, setSummary] = useState<NPGSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [showClosed, setShowClosed] = useState<boolean>(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    
    if (status === "authenticated" && session) {
      fetchData();
    }
  }, [status, session]);

  const fetchData = async () => {
    if (!session?.user?.accessToken) {
      setError("ไม่พบ access token กรุณา logout และ login ใหม่");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = session.user.accessToken;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      console.log("🔍 Fetching NPG data with token:", token.substring(0, 20) + "...");
      
      // ✅ เรียก Backend โดยตรง
      const accountsResponse = await fetch(`${baseUrl}/npg/accounts/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      console.log("📡 Accounts response:", accountsResponse.status);

      if (!accountsResponse.ok) {
        if (accountsResponse.status === 401 || accountsResponse.status === 403) {
          setError("Session หมดอายุ กรุณา login ใหม่");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }
        throw new Error(`HTTP ${accountsResponse.status}`);
      }
      
      const accountsData = await accountsResponse.json();
      console.log("✅ Accounts data:", Array.isArray(accountsData) ? accountsData.length : "not array");
      
      if (Array.isArray(accountsData)) {
        setAccounts(accountsData);
      } else {
        console.error("Accounts data is not an array:", accountsData);
        setAccounts([]);
      }

      // Fetch summary
      const summaryResponse = await fetch(`${baseUrl}/npg/accounts/summary/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error("❌ Error fetching NPG data:", error);
      setError(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลได้");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ filter ร่วม (search + period) ใช้กับทั้ง 2 ตาราง
  const matchesSearchAndPeriod = (account: NPGAccount) => {
    const matchesSearch =
      account.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bike_info?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bike_info?.brand?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPeriod =
      periodFilter === "all" || (account.order_npg_period || account.period_type) === periodFilter;

    return matchesSearch && matchesPeriod;
  };

  // ✅ ตารางหลัก - เฉพาะบัญชีที่ยังไม่ปิด (active/completed/overdue) + กรองตาม statusFilter ที่เลือก
  const filteredAccounts = Array.isArray(accounts) ? accounts.filter((account) => {
    if (account.status === "closed") return false; // แยกไปตารางปิดบัญชีเสมอ

    const isOverdue = account.status === "overdue" || account.is_overdue === true;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "overdue" ? isOverdue : account.status === statusFilter);

    return matchesSearchAndPeriod(account) && matchesStatus;
  }) : [];

  // ✅ ตารางแยก - เฉพาะบัญชีที่ปิดแล้วเท่านั้น (ไม่สนใจ statusFilter เพราะแยกออกมาแล้ว)
  const closedAccounts = Array.isArray(accounts) ? accounts.filter((account) => {
    return account.status === "closed" && matchesSearchAndPeriod(account);
  }) : [];

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">ระบบจัดการ NPG</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-3">
            <Button onClick={fetchData} variant="default">
              ลองอีกครั้ง
            </Button>
            <Button onClick={() => router.push("/login")} variant="outline">
              ไปหน้า Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">ระบบจัดการ NPG</h1>
          <p className="text-gray-600">จัดการการชำระเงินผ่านระบบไฟแนนซ์ NPG</p>
        </div>
      </div>

      {summary && (
        <NPGSummary
          summary={{
            ...summary,
            // ✅ นับจำนวนเกินกำหนดจริงจากรายการบัญชี (is_overdue คำนวณสด) แทนค่าจาก backend ที่อาจยังไม่อัปเดต
            overdue_accounts: Array.isArray(accounts)
              ? accounts.filter((a) => a.status === "overdue" || a.is_overdue === true).length
              : summary.overdue_accounts,
          }}
          userRole={session?.user?.role}
        />
      )}

      <NPGTable
        accounts={filteredAccounts}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        periodFilter={periodFilter}
        onPeriodFilterChange={setPeriodFilter}
        onRefresh={fetchData}
      />

      {/* ✅ บัญชีที่ปิดแล้ว - แยกออกมาต่างหาก พับเก็บไว้เป็นค่าเริ่มต้น */}
      {closedAccounts.length > 0 && (
        <div className="border rounded-lg">
          <button
            onClick={() => setShowClosed((v) => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Archive className="h-4 w-4" />
              บัญชีที่ปิดแล้ว ({closedAccounts.length})
            </div>
            {showClosed ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>

          {showClosed && (
            <div className="p-4 pt-0">
              <NPGTable
                accounts={closedAccounts}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter="closed"
                onStatusFilterChange={() => {}}
                periodFilter={periodFilter}
                onPeriodFilterChange={setPeriodFilter}
                onRefresh={fetchData}
                hideStatusFilter
                title="บัญชีที่ปิดแล้ว"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}