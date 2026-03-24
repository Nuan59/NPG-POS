import { Button } from "@/components/ui/button";
import { IOrder } from "@/types/Order";
import { getDate } from "@/util/GetDateString";
import { Receipt, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import React from "react";

interface LatestSalesProps {
  sales: IOrder[];
}

const LatestSales = ({ sales }: LatestSalesProps) => {
  if (!sales || !Array.isArray(sales) || sales.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Receipt size={40} className="text-gray-400" />
        </div>
        <p className="text-gray-500 text-lg">ยังไม่มีข้อมูลการขาย</p>
        <p className="text-gray-400 text-sm mt-2">รายการขายจะแสดงที่นี่</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp size={24} className="text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">การขายล่าสุด</h3>
              <p className="text-sm text-gray-500">รายการขาย {sales.length} รายการ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock size={16} />
            <span>อัปเดตล่าสุด</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ลูกค้า</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">สินค้า</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">วันที่ขาย</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">ยอดเงิน</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">ใบเสร็จ</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale, index) => (
              <tr
                key={sale.id}
                className={`border-b hover:bg-orange-50 transition-colors ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                      {(typeof sale.customer === 'string' 
                        ? sale.customer 
                        : sale.customer?.name || '?')[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">
                      {typeof sale.customer === 'string' 
                        ? sale.customer 
                        : sale.customer?.name || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {sale.bikes && sale.bikes.length > 0 ? (
                    <div>
                      <div className="font-medium text-gray-800">
                        {sale.bikes[0].model_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {sale.bikes[0].model_code}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-600">
                    {sale.sale_date ? getDate(sale.sale_date) : '-'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-bold text-lg text-orange-600">
                    ฿{sale.total ? sale.total.toLocaleString() : '0'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/sales/${sale.id}/receipt`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-orange-100 hover:text-orange-600"
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      ดูใบเสร็จ
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LatestSales;