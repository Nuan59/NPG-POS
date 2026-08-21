// FinancialFeeBreakdownTable.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/FinancialFeeBreakdownTable.tsx
"use client";

import { FeeBreakdownItem, fmt } from "../util/financialTypes";

interface FinancialFeeBreakdownTableProps {
  feeBreakdown: FeeBreakdownItem[];
}

const FinancialFeeBreakdownTable = ({ feeBreakdown }: FinancialFeeBreakdownTableProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">รายละเอียดค่าใช้จ่ายเพิ่มเติม</h2>
      {feeBreakdown.length === 0 ? (
        <p className="text-sm text-gray-500">ไม่มีรายการค่าใช้จ่ายเพิ่มเติมในช่วงที่เลือก</p>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">รายการ</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">จำนวนครั้ง</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">ยอดรวม</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {feeBreakdown.map((fee, index) => (
              <tr key={index}>
                <td className="px-4 py-3 text-sm">{fee.description}</td>
                <td className="px-4 py-3 text-sm text-right">{fee.count}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold">{fmt(fee.total_amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-semibold">
            <tr>
              <td className="px-4 py-3 text-sm">รวม</td>
              <td className="px-4 py-3 text-sm text-right">
                {feeBreakdown.reduce((sum, f) => sum + f.count, 0)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {fmt(feeBreakdown.reduce((sum, f) => sum + f.total_amount, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
};

export default FinancialFeeBreakdownTable;