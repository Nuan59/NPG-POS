"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import NPGSummary from "./components/NPGSummary";
import NPGTable from "./components/NPGTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

  const filteredAccounts = Array.isArray(accounts) ? accounts.filter((account) => {
    const matchesSearch =
      account.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bike_info?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.bike_info?.brand?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || account.status === statusFilter;

    const matchesPeriod =
      periodFilter === "all" || account.period_type === periodFilter;

    return matchesSearch && matchesStatus && matchesPeriod;
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

      {summary && <NPGSummary summary={summary} userRole={session?.user?.role} />}

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
    </div>
  );
}