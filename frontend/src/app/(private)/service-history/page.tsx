"use client";
// ✅ เมนู "ใบเสร็จ & ประวัติรถ"
// แท็บ ใบเสร็จชั่วคราว = ทุกใบที่ออกให้ลูกค้า (ยกเว้นขายรถ) / แท็บ ประวัติรถ = ค้นหารถ ดูงานทั้งหมดของคันนั้น
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bike as BikeIcon, Receipt } from "lucide-react";
import ReceiptRegister from "./components/ReceiptRegister";
import BikeHistory from "./components/BikeHistory";

type Tab = "receipts" | "bike";

export default function ReceiptsAndHistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bikeFromUrl = searchParams.get("bike");
  const [tab, setTab] = useState<Tab>(bikeFromUrl ? "bike" : "receipts");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (bikeFromUrl) setTab("bike");
  }, [bikeFromUrl]);

  const tabs: { id: Tab; label: string; icon: typeof Receipt }[] = [
    { id: "receipts", label: "ใบเสร็จชั่วคราว", icon: Receipt },
    { id: "bike", label: "ประวัติรถ", icon: BikeIcon },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-semibold prompt">ใบเสร็จ & ประวัติรถ</h2>
        <h6 className="prompt text-slate-500">ใบเสร็จชั่วคราวทุกใบที่ออกให้ลูกค้า · พิมพ์ซ้ำได้ · ใบเสร็จรับเงิน (ขายรถ) อยู่ที่ รายการขาย → เอกสาร</h6>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-[#F26B1D] text-[#F26B1D]" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "receipts" ? (
        <ReceiptRegister onBike={(id) => router.push(`/service-history?bike=${id}`)} />
      ) : (
        <BikeHistory key={bikeFromUrl || "none"} bikeIdFromUrl={bikeFromUrl} />
      )}
    </div>
  );
}
