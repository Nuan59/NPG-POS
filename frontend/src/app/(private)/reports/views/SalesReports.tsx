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
  // ✅ ล็อกปีไว้ที่ 2569 (2026 ค.ศ.) ตามที่ขอ - เฉพาะรายงาน "ขาย" เท่านั้น
  // ไม่กระทบแท็บ "การเงิน" ที่ยังเลือกปีอื่นได้ตามปกติ
  const LOCKED_YEAR = "2026";

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

  const [selectedYear] = useState<string>(LOCKED_YEAR);
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
    <div className="w-full p-6 space-y-6">
      <SalesFilters
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        years={years}
        onYearChange={() => {}}
        onMonthChange={setSelectedMonth}
        lockYear
      />

      <div className="bg-white rounded-lg shadow p-6">
        <SaleTrends orders={filteredOrders} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <ModelSales orders={filteredOrders} />
      </div>

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