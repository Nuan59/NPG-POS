"use client";

import { useMemo, useState } from "react";
import { IOrder } from "@/types/Order";
import { MONTHS } from "../util/index";
import { classifyCashOrInstallment } from "../util/salesHelpers";

import SalesFilters from "../components/SalesFilters";
import SaleTrends from "../components/SaleTrends";
import SalesModelTable from "../components/SalesModelTable";
import SalePayments from "../components/SalePayments";
import VehicleTypeSales from "../components/VehicleTypeSales";
import SalesDetailTable, { SalesDetailRow } from "../components/SalesDetailTable";

interface SalesReportsProps {
  // ✅ orders ดึงมาจาก server component (page.tsx) แล้วส่งเป็น prop เหมือนหน้าการเงิน
  orders?: IOrder[];
}

const SalesReports = ({ orders = [] }: SalesReportsProps) => {
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          orders
            .filter((o) => o.sale_date)
            .map((o) => String(new Date(o.sale_date).getFullYear()))
        )
      ).sort(),
    [orders]
  );

  // ✅ ค่าเริ่มต้น = ปีล่าสุดที่มีข้อมูล แต่เลือกปีอื่น/ทุกปีได้ตามปกติ (ไม่ล็อกอีกต่อไป)
  const [selectedYear, setSelectedYear] = useState<string>(
    () => years[years.length - 1] || "all"
  );
  // ✅ เลือกได้หลายเดือนพร้อมกัน - array ว่าง = ทุกเดือน
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // ✅ กรอง orders ตามปี/เดือนที่เลือก แล้วส่งชุดเดียวกันนี้ให้ทุกกราฟ + ตารางรายละเอียด
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!order.sale_date) return false;
      const d = new Date(order.sale_date);
      const orderYear = String(d.getFullYear());
      const orderMonth = MONTHS[d.getMonth()];

      if (selectedYear !== "all" && orderYear !== selectedYear) return false;
      if (selectedMonths.length > 0 && !selectedMonths.includes(orderMonth)) return false;
      return true;
    });
  }, [orders, selectedYear, selectedMonths]);

  // ✅ ตารางรายละเอียด: รุ่นไหน ขายเมื่อไหร่ สดหรือผ่อน ขายไปเท่าไหร่
  const detailRows: SalesDetailRow[] = useMemo(() => {
    return filteredOrders.map((order) => {
      const bikes = order.bikes || [];
      const modelLabel =
        bikes.length === 0
          ? "ไม่ระบุ"
          : bikes.length === 1
          ? bikes[0].model_name
          : `${bikes[0].model_name} +${bikes.length - 1} คัน`;

      const d = new Date(order.sale_date);

      return {
        orderId: order.id,
        date: d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }),
        dateSort: d.getTime(),
        modelLabel,
        paymentLabel: classifyCashOrInstallment(order.payment_method || ""),
        amount: Number(order.sale_price || 0),
      };
    });
  }, [filteredOrders]);

  return (
    <div className="w-full p-6 space-y-6">
      <SalesFilters
        selectedYear={selectedYear}
        selectedMonths={selectedMonths}
        years={years}
        onYearChange={setSelectedYear}
        onMonthsChange={setSelectedMonths}
      />

      <div className="bg-white rounded-lg shadow p-6">
        <SaleTrends orders={filteredOrders} />
      </div>

      {/* ✅ แทนที่กราฟเส้นยอดขายแยกตามรุ่นรถ (ที่มีสีเยอะและ legend รกเกินไป) ด้วยตารางง่ายๆ */}
      <SalesModelTable orders={filteredOrders} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 min-w-0">
          <SalePayments orders={filteredOrders} />
        </div>
        <div className="bg-white rounded-lg shadow p-6 min-w-0">
          <VehicleTypeSales orders={filteredOrders} />
        </div>
      </div>

      <SalesDetailTable rows={detailRows} />
    </div>
  );
};

export default SalesReports;