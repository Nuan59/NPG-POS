// SalesDetailTable.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/SalesDetailTable.tsx
"use client";

import Link from "next/link";

export type SalesDetailRow = {
  orderId: number;
  date: string; // แสดงผลแบบไทยแล้ว (พร้อมใช้)
  dateSort: number; // timestamp ไว้เรียงลำดับ
  modelLabel: string; // ชื่อรุ่น (ถ้ามีหลายคันจะรวมเป็น "รุ่นA +2 คัน")
  paymentLabel: "เงินสด" | "ผ่อนชำระ";
  amount: number;
};

interface SalesDetailTableProps {
  rows: SalesDetailRow[];
}

const fmt = (num: number) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(num);

const SalesDetailTable = ({ rows }: SalesDetailTableProps) => {
  const sorted = [...rows].sort((a, b) => b.dateSort - a.dateSort);
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">รายละเอียดการขาย</h3>
        <span className="text-sm text-gray-500">{rows.length} รายการ</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">ไม่มีรายการขายในช่วงที่เลือก</p>
      ) : (
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">วันที่</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">รุ่นรถ</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">วิธีชำระ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">ยอดขาย</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((row) => (
                <tr key={row.orderId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">{row.date}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/sales/${row.orderId}`} className="text-blue-600 hover:underline">
                      {row.modelLabel}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        row.paymentLabel === "เงินสด"
                          ? "bg-yellow-50 text-yellow-800"
                          : "bg-blue-50 text-blue-800"
                      }`}
                    >
                      {row.paymentLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{fmt(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold sticky bottom-0">
              <tr>
                <td className="px-4 py-3 text-sm" colSpan={3}>รวม</td>
                <td className="px-4 py-3 text-sm text-right">{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalesDetailTable;