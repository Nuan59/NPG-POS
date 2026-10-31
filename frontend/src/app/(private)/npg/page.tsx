"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NPGSummary, { NPGPortfolioSummary } from "./components/NPGSummary";
import NPGTable from "./components/NPGTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronDown, Archive, RefreshCw, AlertTriangle } from "lucide-react";

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
  period_type: "รายวัน" | "รายสัปดาห์" | "รายเดือน" | "รายปี";
  order_npg_period?: "รายวัน" | "รายสัปดาห์" | "รายเดือน" | "รายปี" | null;  // ✅ ค่าจริงจาก Order.npg_period (แม่นกว่า period_type เดิม)
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
  estimated_late_fee?: number; // ✅ ค่าปรับโดยประมาณถ้าจ่ายวันนี้ (backend ส่งมา)
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

// ✅ เกินกำหนดหรือไม่ - ใช้ is_overdue (คำนวณสดจาก backend) ก่อนเสมอ
const isAccountOverdue = (a: NPGAccount) => a.status === "overdue" || a.is_overdue === true;

// ✅ นับ "ชำระครบ" (completed) เป็นบัญชีที่จบแล้วเหมือน "ปิดบัญชี" (closed) - โชว์รวมกันในส่วน "บัญชีที่ปิดแล้ว"
// ไม่ได้เปลี่ยนค่า status จริงในฐานข้อมูล แค่จัดกลุ่มตอนแสดงผล
const isFinishedAccount = (account: NPGAccount) =>
  account.status === "closed" || account.status === "completed";

export default function NPGPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [accounts, setAccounts] = useState<NPGAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [showClosed, setShowClosed] = useState<boolean>(false);
  const loadedOnce = useRef(false);
  const inFlight = useRef(false);

  const accessToken = session?.user?.accessToken;

  // ✅ admin เห็นป้าย/ตัวเลข "หนี้เสีย" - พนักงานไม่เห็น
  const isAdmin = ["adm", "admin", "administrator"].includes(
    String(session?.user?.role ?? "").toLowerCase()
  );

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setError("ไม่พบ access token กรุณา logout และ login ใหม่");
      setLoading(false);
      return;
    }
    if (inFlight.current) return; // ✅ กันกดรีเฟรชซ้ำระหว่างกำลังโหลด
    inFlight.current = true;

    try {
      // ✅ โหลดครั้งแรกโชว์ skeleton / รีเฟรชครั้งถัดไปคงตารางเดิมไว้ แค่หมุนไอคอน
      if (loadedOnce.current) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const accountsResponse = await fetch(`${baseUrl}/npg/accounts/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
        loadedOnce.current = true;
      } else {
        console.error("Accounts data is not an array:", accountsData);
        setAccounts([]);
      }
    } catch (error) {
      console.error("❌ Error fetching NPG data:", error);
      setError(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลได้");
      setAccounts([]);
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    // ✅ ผูกกับ token แทน object session - ไม่โหลดใหม่ทุกครั้งที่สลับแท็บกลับมา
    if (status === "authenticated" && accessToken) {
      fetchData();
    }
  }, [status, accessToken, fetchData, router]);

  const list = Array.isArray(accounts) ? accounts : [];

  const matchesSearchAndPeriod = (account: NPGAccount) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      account.customer_name?.toLowerCase().includes(q) ||
      account.customer_phone?.replace(/-/g, "").includes(q.replace(/-/g, "")) || // ✅ ค้นด้วยเบอร์โทรได้
      account.bike_info?.model_name?.toLowerCase().includes(q) ||
      account.bike_info?.brand?.toLowerCase().includes(q);

    const matchesPeriod =
      periodFilter === "all" || (account.order_npg_period || account.period_type) === periodFilter;

    return !!matchesSearch && matchesPeriod;
  };

  const matchesStatus = (account: NPGAccount, filter: string) =>
    filter === "all" ||
    (filter === "overdue" ? isAccountOverdue(account) : account.status === filter);

  // บัญชีที่ยังผ่อนอยู่ (ไม่รวมปิดแล้ว/ชำระครบ) ที่ผ่านช่องค้นหา + ประเภทงวด
  const liveMatched = list.filter((a) => !isFinishedAccount(a) && matchesSearchAndPeriod(a));

  const statusCounts = {
    all: liveMatched.length,
    active: liveMatched.filter((a) => matchesStatus(a, "active")).length,
    overdue: liveMatched.filter((a) => matchesStatus(a, "overdue")).length,
  };

  // ✅ เรียงให้ลูกค้าที่เกินกำหนดขึ้นก่อน (เกินนานสุดอยู่บนสุด) ที่เหลือคงลำดับเดิมจาก backend
  const filteredAccounts = liveMatched
    .filter((a) => matchesStatus(a, statusFilter))
    .map((a, i) => ({ a, i }))
    .sort((x, y) => {
      const ox = isAccountOverdue(x.a) ? 1 : 0;
      const oy = isAccountOverdue(y.a) ? 1 : 0;
      if (ox !== oy) return oy - ox;
      if (ox && oy) {
        const dx = Number(x.a.metrics?.days_overdue || 0);
        const dy = Number(y.a.metrics?.days_overdue || 0);
        if (dx !== dy) return dy - dx;
      }
      return x.i - y.i;
    })
    .map((x) => x.a);

  const closedAccounts = list.filter((account) => isFinishedAccount(account) && matchesSearchAndPeriod(account));

  // ✅ สรุปภาพรวมทุกบัญชี (รวมบัญชีที่ปิดแล้ว) - คำนวณฝั่ง client จาก metrics ของแต่ละบัญชี
  const portfolioSummary: NPGPortfolioSummary = useMemo(() => {
    const sum = (key: keyof NPGAccountMetrics) =>
      list.reduce((total, a) => total + Number((a.metrics as any)?.[key] || 0), 0);

    return {
      total_accounts: list.length,
      active_accounts: list.filter((a) => !isFinishedAccount(a)).length,
      overdue_accounts: list.filter((a) => !isFinishedAccount(a) && isAccountOverdue(a)).length,
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

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#1e2432]">ระบบจัดการ NPG</h1>
        <p className="text-sm text-[#7A7A7A]">ติดตามการผ่อนชำระของลูกค้า NPG</p>
      </div>
      <Button
        variant="outline"
        onClick={fetchData}
        disabled={loading || refreshing}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        {refreshing ? "กำลังโหลด..." : "รีเฟรช"}
      </Button>
    </div>
  );

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1e2432]">ระบบจัดการ NPG</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-xl">
          <h2 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-3">
            <Button onClick={fetchData} className="bg-[#F26B1D] hover:bg-[#d95c14] text-white">
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
    <div className="container mx-auto p-4 md:p-6 space-y-5">
      {header}

      <NPGSummary
        summary={portfolioSummary}
        userRole={session?.user?.role}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

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
        refreshing={refreshing}
        statusCounts={statusCounts}
      />

      {closedAccounts.length > 0 && (
        <div className="rounded-xl border bg-white">
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors rounded-xl"
          >
            <span className="flex items-center gap-2 text-[#7A7A7A] font-semibold">
              <Archive className="h-4 w-4" />
              บัญชีที่ปิดแล้ว ({closedAccounts.length})
            </span>
            <ChevronDown
              className={`h-4 w-4 text-[#7A7A7A] transition-transform ${showClosed ? "rotate-180" : ""}`}
            />
          </button>

          {showClosed && (
            <div className="border-t">
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
                refreshing={refreshing}
                hideStatusFilter
                hideToolbar
                embedded
                title="บัญชีที่ปิดแล้ว"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}