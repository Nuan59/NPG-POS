// SalesModelTable.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/SalesModelTable.tsx
"use client";

import { useMemo } from "react";
import { IOrder } from "@/types/Order";

interface SalesModelTableProps {
  orders: IOrder[];
}

const SalesModelTable = ({ orders }: SalesModelTableProps) => {
  const rows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) {
      for (const bike of order.bikes || []) {
        const name = bike.model_name || "ไม่ระบุ";
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([model_name, count]) => ({ model_name, count }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">ยอดขายแยกตามรุ่นรถ</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">ไม่มีข้อมูลยอดขายในช่วงที่เลือก</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">รุ่นรถ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">จำนวนขาย</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.model_name}</td>
                  <td className="px-4 py-3 text-sm text-right">{row.count} คัน</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td className="px-4 py-3 text-sm">รวม</td>
                <td className="px-4 py-3 text-sm text-right">{total} คัน</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalesModelTable;