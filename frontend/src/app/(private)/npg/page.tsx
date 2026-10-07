"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NPGSummary, { NPGPortfolioSummary } from "./components/NPGSummary";
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
  // ✅ แยกประเภทบัญชี - "finance" = ผ่อนไฟแนนซ์ทั้งคันตามปกติ, "down_payment" = ผ่อนเฉพาะเงินดาวน์
  account_type?: "finance" | "down_payment";
  finance_amount: number;
  interest_rate: number;
  installment_count: number;
  installment_amount: number;
  period_type: "รายเดือน" | "รายปี";
  order_npg_period?: "รายเดือน" | "รายปี" | null;  // ✅ ค่าจริงจาก Order.npg_period (แม่นกว่า period_type เดิม)
  order_payment_method?: string | null;  // ✅ วิธีชำระเงินหลักของออเดอร์ (ใช้กับบัญชีผ่อนดาวน์)
  paid_count: number;
  total_paid: number;
  remaining_balance: number;
  start_date: string;
  next_payment_date: string;
  last_payment_date: string | null;
  progress_percentage: number;
  is_overdue: boolean;
  days_until_payment: number | null;
  // ✅ ตัวเลขสรุปสัญญา (คำนวณจาก backend - NPGSerializer.get_metrics)
  metrics?: NPGAccountMetrics;
}

export interface NPGAccountMetrics {
  credit: number;
  expected_total: number;
  paid: number;
  principal_paid: number;
  interest_received: number;
  outstanding: number;
  late_fees: number;
  other_fees: number;
  fees_received: number;
  realized_profit: number;
  days_overdue: number;
  bad_debt: number;
  contract_status: "normal" | "overdue" | "bad_debt" | "closed";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [showClosed, setShowClosed] = useState<boolean>(false);

  // ✅ admin เห็นป้าย/ตัวเลข "หนี้เสีย" - พนักงานไม่เห็น
  const isAdmin = ["adm", "admin", "administrator"].includes(
    String(session?.user?.role ?? "").toLowerCase()
  );

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

      const accountsResponse = await fetch(`${baseUrl}/npg/accounts/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!accountsResponse.ok) {
        if (accountsResponse.status === 401 || accountsResponse.status === 403) {
          setError("Session หมดอายุ กรุณา login ใหม่");
          setTimeout(() => router.push("/login"), 2000);
          return;
        }
        throw new Error(`HTTP ${accountsResponse.status}`);
      }

      const accountsData = await accountsResponse.json();

      if (Array.isArray(accountsData)) {
        setAccounts(accountsData);
      } else {
        console.error("Accounts data is not an array:", accountsData);
        setAccounts([]);
      }

    } catch (error) {
      console.error("❌ Error fetching NPG data:", error);
      setError(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลได้");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const matchesSearchAndPeriod = (account: NPGAccount) => {
    const matchesSearch =
      account.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bike_info?.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bike_info?.brand?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPeriod =
      periodFilter === "all" || (account.order_npg_period || account.period_type) === periodFilter;

    return matchesSearch && matchesPeriod;
  };

  // ✅ นับ "ชำระครบ" (completed) เป็นบัญชีที่จบแล้วเหมือน "ปิดบัญชี" (closed) - ย้ายไปโชว์รวมกัน
  // ในส่วน "บัญชีที่ปิดแล้ว" ด้วย เพราะทั้งคู่คือลูกค้าที่ไม่ต้องติดตามแล้ว ต่างกันแค่จ่ายครบเองตามปกติ
  // หรือปิดก่อนกำหนด (ได้ส่วนลดดอกเบี้ย) - ไม่ได้เปลี่ยนค่า status จริงในฐานข้อมูล แค่จัดกลุ่มตอนแสดงผล
  const isFinishedAccount = (account: NPGAccount) =>
    account.status === "closed" || account.status === "completed";

  const filteredAccounts = Array.isArray(accounts) ? accounts.filter((account) => {
    if (isFinishedAccount(account)) return false;

    const isOverdue = account.status === "overdue" || account.is_overdue === true;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "overdue" ? isOverdue : account.status === statusFilter);

    return matchesSearchAndPeriod(account) && matchesStatus;
  }) : [];

  const closedAccounts = Array.isArray(accounts) ? accounts.filter((account) => {
    return isFinishedAccount(account) && matchesSearchAndPeriod(account);
  }) : [];

  // ✅ สรุปภาพรวมทุกบัญชี (รวมบัญชีที่ปิดแล้ว) - คำนวณฝั่ง client จาก metrics ของแต่ละบัญชี
  const portfolioSummary: NPGPortfolioSummary = useMemo(() => {
    const list = Array.isArray(accounts) ? accounts : [];
    const sum = (key: keyof NPGAccountMetrics) =>
      list.reduce((total, a) => total + Number((a.metrics as any)?.[key] || 0), 0);

    return {
      total_accounts: list.length,
      active_accounts: list.filter((a) => !isFinishedAccount(a)).length,
      overdue_accounts: list.filter(
        (a) => !isFinishedAccount(a) && (a.status === "overdue" || a.is_overdue === true)
      ).length,
      bad_debt_accounts: list.filter((a) => a.metrics?.contract_status === "bad_debt").length,
      credit: sum("credit"),
      expected_total: sum("expected_total"),
      paid: sum("paid"),
      principal_paid: sum("principal_paid"),
      interest_received: sum("interest_received"),
      outstanding: sum("outstanding"),
      fees_received: sum("fees_received"),
      realized_profit: sum("realized_profit"),
      bad_debt: sum("bad_debt"),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

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

      <NPGSummary summary={portfolioSummary} userRole={session?.user?.role} />

      <NPGTable
        isAdmin={isAdmin}
        accounts={filteredAccounts}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        periodFilter={periodFilter}
        onPeriodFilterChange={setPeriodFilter}
        onRefresh={fetchData}
      />

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
        isAdmin={isAdmin}
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