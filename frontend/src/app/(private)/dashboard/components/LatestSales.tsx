import { IOrder } from "@/types/Order";
import { getDate } from "@/util/GetDateString";
import { Receipt } from "lucide-react";
import Link from "next/link";
import React from "react";

interface LatestSalesProps {
  sales: IOrder[];
}

// สีจุดตามประเภทการชำระ
const PAY_COLORS: Record<string, string> = {
  "เงินสด": "#eab308",
  NPG: "#f26b1d",
  Cathay: "#16a34a",
  "ทรัพย์สยาม": "#2563eb",
  Summit: "#9333ea",
  "S Leasing": "#0891b2",
  CIMB: "#dc2626",
  "World Lease": "#4f46e5",
  "เงินติดล้อ": "#65a30d",
};

const customerName = (sale: IOrder) =>
  typeof sale.customer === "string" ? sale.customer : (sale.customer as any)?.name || "-";

const PayTag = ({ method }: { method?: string }) => (
  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border border-gray-200 bg-white whitespace-nowrap">
    <i className="w-[7px] h-[7px] rounded-full" style={{ background: PAY_COLORS[method ?? ""] ?? "#9ca3af" }} />
    {method ?? "-"}
  </span>
);

const LatestSales = ({ sales }: LatestSalesProps) => {
  if (!sales || !Array.isArray(sales) || sales.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-xl grid place-items-center mx-auto mb-3">
          <Receipt size={28} className="text-gray-400" />
        </div>
        <p className="text-gray-500">ยังไม่มีข้อมูลการขาย</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      {/* หัวตาราง */}
      <div className="hidden md:grid grid-cols-[2fr_2fr_1.2fr_1fr_auto] gap-3 px-5 py-2.5 bg-slate-50 text-xs text-gray-500">
        <span>ลูกค้า</span>
        <span>สินค้า</span>
        <span>วันที่ขาย</span>
        <span>ประเภท</span>
        <span className="w-[72px]" />
      </div>

      {sales.map((sale) => {
        const name = customerName(sale);
        const bike = sale.bikes?.[0];
        return (
          <div
            key={sale.id}
            className="grid grid-cols-[1fr_auto] md:grid-cols-[2fr_2fr_1.2fr_1fr_auto] gap-3 items-center px-4 md:px-5 py-3 border-t border-gray-100 first:border-t-0 md:first:border-t hover:bg-orange-50/40 transition-colors"
          >
            {/* ลูกค้า (+ ข้อมูลย่อบนมือถือ) */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex-none w-9 h-9 rounded-xl bg-[#1e2432] text-white grid place-items-center text-sm">
                {name[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{name}</p>
                <p className="md:hidden text-xs text-gray-500 truncate">
                  {bike?.model_name ?? "-"} · {sale.sale_date ? getDate(sale.sale_date) : "-"}
                </p>
              </div>
            </div>

            <div className="hidden md:block min-w-0">
              {bike ? (
                <>
                  <p className="font-medium text-sm text-gray-800 truncate">{bike.model_name}</p>
                  <p className="text-xs text-gray-500 truncate">{bike.model_code}</p>
                </>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>

            <div className="hidden md:block text-sm text-gray-500">
              {sale.sale_date ? getDate(sale.sale_date) : "-"}
            </div>

            <div className="hidden md:block">
              <PayTag method={sale.payment_method} />
            </div>

            <Link
              href={`/sales/${sale.id}/receipt`}
              className="text-sm text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg whitespace-nowrap hover:bg-orange-50"
            >
              ใบเสร็จ
            </Link>
          </div>
        );
      })}
    </div>
  );
};

export default LatestSales;