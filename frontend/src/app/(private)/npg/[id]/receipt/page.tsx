"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ViewTempReceipt from "./components/ViewTempReceipt";
import ActionButtons from "./components/ActionButtons";
import { TempReceiptItem } from "@/components/pdf/TempReceiptTemplate";

interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  chassisNumber?: string;
  paymentMethodLabel?: string;
  items: TempReceiptItem[];
  total: number;
}

export default function NPGReceiptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  const accountId = params.id as string;
  const paymentId = searchParams.get("payment_id");

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated" || !session) return;

    if (!paymentId) {
      setError("ไม่พบรหัสรายการชำระเงิน (payment_id)");
      setLoading(false);
      return;
    }

    const fetchReceipt = async () => {
      if (!session?.user?.accessToken) {
        setError("ไม่พบ access token กรุณา login ใหม่");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        const response = await fetch(`${baseUrl}/npg/payments/${paymentId}/receipt/`, {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setReceipt(data);
      } catch (err) {
        console.error("Error fetching receipt:", err);
        setError(err instanceof Error ? err.message : "ไม่สามารถโหลดใบเสร็จได้");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
    // ✅ ผูกกับ token แทน object session - ไม่โหลดใบเสร็จ/สร้าง PDF ใหม่ทุกครั้งที่สลับแท็บกลับมา
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.accessToken, paymentId, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3 text-[#7A7A7A]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#F26B1D]" />
        <p>กำลังโหลดใบเสร็จ...</p>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-xl">
          <h2 className="text-xl font-bold text-red-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-600 mb-4">{error || "ไม่พบข้อมูลใบเสร็จ"}</p>
          <Link href={`/npg/${accountId}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              กลับไปบัญชี
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/npg/${accountId}`}>
          <Button variant="outline" size="icon" aria-label="กลับ">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <p className="text-xs text-[#7A7A7A]">ใบเสร็จรับเงินชั่วคราว</p>
          <h1 className="text-xl md:text-2xl font-bold text-[#1e2432] font-mono truncate">{receipt.receiptNumber}</h1>
        </div>
      </div>

      <div className="h-[75vh] rounded-xl overflow-hidden border bg-slate-600">
        <ViewTempReceipt data={receipt} />
      </div>

      <ActionButtons data={receipt} backHref={`/npg/${accountId}`} />
    </div>
  );
}