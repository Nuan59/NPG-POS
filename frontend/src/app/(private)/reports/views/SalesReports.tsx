"use client";

import { useMemo, useState } from "react";
import { IOrder } from "@/types/Order";
import { MONTHS } from "../util/index";
import { classifyCashOrInstallment } from "../util/salesHelpers";

import SalesFilters from "../components/SalesFilters";
import SaleTrends from "../components/SaleTrends";
import ModelSales from "../components/ModelSales";
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

  // ✅ ค่าเริ่มต้น = ปีล่าสุดที่มีข้อมูล (เช่น 2026 = พ.ศ. 2569) แทนการโชว์ทุกปีซ้อนกัน
  const [selectedYear, setSelectedYear] = useState<string>(
    () => years[years.length - 1] || "all"
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // ✅ กรอง orders ตามปี/เดือนที่เลือก แล้วส่งชุดเดียวกันนี้ให้ทุกกราฟ + ตารางรายละเอียด
  // เพื่อให้ทุกส่วนขยับตามตัวกรองพร้อมกันหมด
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!order.sale_date) return false;
      const d = new Date(order.sale_date);
      const orderYear = String(d.getFullYear());
      const orderMonth = MONTHS[d.getMonth()];

      if (selectedYear !== "all" && orderYear !== selectedYear) return false;
      if (selectedMonth !== "all" && orderMonth !== selectedMonth) return false;
      return true;
    });
  }, [orders, selectedYear, selectedMonth]);

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
    <div
      className="
				flex flex-col gap-5 h-full w-full
				origin-top scale-[0.8]   /* ← ลด ~20% */
			"
    >
      <SalesFilters
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        years={years}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
      />

      <SaleTrends orders={filteredOrders} />
      <ModelSales orders={filteredOrders} />

      <div className="flex flex-col xl:flex-row gap-5 w-full items-stretch">
        <div className="w-full xl:w-1/2">
          <SalePayments orders={filteredOrders} />
        </div>
        <div className="w-full xl:w-1/2">
          <VehicleTypeSales orders={filteredOrders} />
        </div>
      </div>

      <SalesDetailTable rows={detailRows} />
    </div>
  );
};

export default SalesReports;