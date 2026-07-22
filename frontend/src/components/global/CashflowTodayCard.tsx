"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";
import { getCashflowTodaySummary } from "@/services/CashflowService";

const fmt = (n: number | undefined | null) =>
  (Number(n) || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });

const CashflowTodayCard = () => {
  const { data: session } = useSession();
  const userInfo = session?.user;
  const [data, setData] = useState<{ cashClosing: number; transferClosing: number } | null>(null);

  useEffect(() => {
    if (userInfo?.role !== "adm") return;
    getCashflowTodaySummary().then((res) => res && setData(res));
  }, [userInfo?.role]);

  if (userInfo?.role !== "adm" || !data) return null;

  return (
    <Link href="/cashflow" className="block">
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-lime-100 p-2 rounded-lg">
              <Wallet size={18} className="text-lime-700" />
            </div>
            <h3 className="font-bold text-gray-800">รายรับ-รายจ่ายวันนี้</h3>
          </div>
          <ArrowRight size={16} className="text-gray-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-emerald-600 mb-0.5">เงินสดคงเหลือ</div>
            <div className="text-lg font-bold text-emerald-700">{fmt(data.cashClosing)} บาท</div>
          </div>
          <div>
            <div className="text-xs text-sky-600 mb-0.5">โอนคงเหลือ</div>
            <div className="text-lg font-bold text-sky-700">{fmt(data.transferClosing)} บาท</div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CashflowTodayCard;
