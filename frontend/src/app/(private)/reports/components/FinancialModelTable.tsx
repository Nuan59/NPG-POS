// FinancialModelTable.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/FinancialModelTable.tsx
"use client";

import { ModelData, fmt } from "../util/financialTypes";

interface FinancialModelTableProps {
  modelData: ModelData[];
}

const FinancialModelTable = ({ modelData }: FinancialModelTableProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">กำไรแยกตามรุ่นรถ</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">รุ่นรถ</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">จำนวนขาย</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">รายได้</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">ต้นทุนรถ</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">กำไร</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {modelData.map((model, index) => {
              const margin =
                model.revenue > 0
                  ? ((model.gross_profit / model.revenue) * 100).toFixed(1)
                  : "0.0";
              const profitColor = model.gross_profit > 0 ? "text-green-600" : "text-red-600";
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{model.model_name}</td>
                  <td className="px-4 py-3 text-sm text-right">{model.count}</td>
                  <td className="px-4 py-3 text-sm text-right">{fmt(model.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{fmt(model.cost)}</td>
                  <td className={`px-4 py-3 text-sm text-right font-semibold ${profitColor}`}>
                    {fmt(model.gross_profit)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${profitColor}`}>{margin}%</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-100 font-semibold">
            <tr>
              <td className="px-4 py-3 text-sm">รวม</td>
              <td className="px-4 py-3 text-sm text-right">
                {modelData.reduce((sum, m) => sum + m.count, 0)}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                {fmt(modelData.reduce((sum, m) => sum + m.revenue, 0))}
              </td>
              <td className="px-4 py-3 text-sm text-right text-red-600">
                {fmt(modelData.reduce((sum, m) => sum + m.cost, 0))}
              </td>
              <td className="px-4 py-3 text-sm text-right text-green-600">
                {fmt(modelData.reduce((sum, m) => sum + m.gross_profit, 0))}
              </td>
              <td className="px-4 py-3 text-sm text-right">-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default FinancialModelTable;