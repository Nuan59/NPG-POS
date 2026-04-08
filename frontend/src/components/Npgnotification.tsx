"use client";

import { useState, useEffect } from "react";
import { Clock, AlertCircle, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NPGAccount {
  id: number;
  customer_name: string;
  customer_phone: string;
  bike_info: {
    brand: string;
    model_name: string;
  } | null;
  next_payment_date: string;
  installment_amount: number;
  status: string;
}

interface UpcomingPayment extends NPGAccount {
  daysUntil: number;
}

export default function NPGNotification() {
  const [payments, setPayments] = useState<UpcomingPayment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
    const interval = setInterval(loadPayments, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL;
      if (!apiBase) {
        console.error("❌ API_URL not defined");
        setLoading(false);
        return;
      }

      // ✅ ดึงข้อมูลจาก backend โดยตรง
      const response = await fetch(`${apiBase}/npg/accounts/?status=active`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        console.error(`❌ NPG API error: ${response.status}`);
        setLoading(false);
        return;
      }

      const accounts = await response.json();
      const upcoming = findUpcomingPayments(accounts);
      setPayments(upcoming);
    } catch (error) {
      console.error("❌ Error loading NPG payments:", error);
    }
    setLoading(false);
  };

  const findUpcomingPayments = (accounts: NPGAccount[]): UpcomingPayment[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return accounts
      .filter((a) => a.next_payment_date && a.status === "active")
      .map((account) => {
        const nextPayment = new Date(account.next_payment_date);
        nextPayment.setHours(0, 0, 0, 0);
        const diffTime = nextPayment.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...account, daysUntil };
      })
      .filter((p) => p.daysUntil >= 0 && p.daysUntil <= 5) // เปลี่ยนเป็น 5 วัน และไม่แสดงที่เกินกำหนด
      .sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (days: number) => {
    if (days < 0) return "bg-red-50 text-red-700 border-red-200";
    if (days === 0) return "bg-orange-50 text-orange-700 border-orange-200";
    if (days === 1) return "bg-yellow-50 text-yellow-700 border-yellow-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const getStatusText = (days: number) => {
    if (days === 0) return "วันนี้! 💰";
    if (days === 1) return "พรุ่งนี้";
    return `อีก ${days} วัน`;
  };

  const urgentCount = payments.filter((p) => p.daysUntil >= 0 && p.daysUntil <= 5).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-700 transition-colors"
      >
        <Clock size={24} className="text-slate-200" />
        {payments.length > 0 && (
          <span className="absolute top-0 right-0 bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {payments.length > 9 ? "9+" : payments.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-[600px] flex flex-col border">
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Clock className="text-blue-500" size={20} />
                  แจ้งเตือน NPG
                </h3>
                {payments.length > 0 && (
                  <p className="text-sm text-blue-600 font-medium flex items-center gap-1 mt-1">
                    <AlertCircle size={14} />
                    ใกล้ครบกำหนด {payments.length} รายการ
                  </p>
                )}
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-200 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                  <p className="mt-2">กำลังโหลด...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Clock size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">ไม่มีบัญชีใกล้ครบกำหนด</p>
                  <p className="text-sm mt-1">ระบบจะแจ้งเตือนเมื่อใกล้ถึง 5 วัน</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {payments.map((payment) => (
                    <Link key={payment.id} href={`/npg/${payment.id}`} onClick={() => setIsOpen(false)}
                      className="block hover:bg-gray-50 transition-colors p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 truncate">{payment.customer_name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{payment.customer_phone}</p>
                          {payment.bike_info && (
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {payment.bike_info.brand} {payment.bike_info.model_name}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold border", getStatusColor(payment.daysUntil))}>
                          {getStatusText(payment.daysUntil)}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(payment.next_payment_date)}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{payment.installment_amount.toLocaleString()} บาท</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {payments.length > 0 && (
              <div className="p-3 border-t bg-gray-50">
                <div className="text-center text-sm text-gray-600">
                  ใกล้ครบกำหนด {payments.length} รายการ
                </div>
                <Link href="/npg" onClick={() => setIsOpen(false)}>
                  <button className="w-full mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1">
                    ดูทั้งหมด <ChevronRight size={16} />
                  </button>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}