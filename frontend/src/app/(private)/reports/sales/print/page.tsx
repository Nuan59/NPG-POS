import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import ViewSalesReportPDF from "./components/ViewSalesReportPDF";
import ActionButtons from "./components/ActionButtons";
import { getOrders } from "@/services/OrderService";
import { IOrder } from "@/types/Order";
import { MONTHS } from "../../util/index";
import { classifyCashOrInstallment } from "../../util/salesHelpers";

// ป้องกัน cache เพราะข้อมูลยอดขายต้องเป็นปัจจุบันเสมอ
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SalesReportPrintPageProps {
  searchParams: {
    year?: string; // ปี ค.ศ. เช่น "2026" หรือ "all"
    month?: string; // ชื่อเดือนไทย เช่น "มกราคม" หรือหลายเดือนคั่นด้วย , เช่น "มกราคม,กุมภาพันธ์" หรือ "all"
  };
}

const SalesReportPrintPage = async ({ searchParams }: SalesReportPrintPageProps) => {
  const selectedYear = searchParams.year || "all";
  const monthParam = searchParams.month || "all";
  const selectedMonths = monthParam === "all" || monthParam === "" ? [] : monthParam.split(",");

  const orders: IOrder[] = await getOrders()
    .then((res) => res?.json())
    .catch(() => []);

  const filteredOrders = (Array.isArray(orders) ? orders : []).filter((order) => {
    if (!order.sale_date) return false;
    const d = new Date(order.sale_date);
    const orderYear = String(d.getFullYear());
    const orderMonth = MONTHS[d.getMonth()];

    if (selectedYear !== "all" && orderYear !== selectedYear) return false;
    if (selectedMonths.length > 0 && !selectedMonths.includes(orderMonth)) return false;
    return true;
  });

  // ✅ ตารางรายเดือน (ยอดรวม / รถใหม่ / รถมือสอง)
  const monthlyMap = new Map<string, { total: number; new: number; pre_owned: number }>();
  for (const order of filteredOrders) {
    const month = MONTHS[new Date(order.sale_date).getMonth()];
    if (!monthlyMap.has(month)) monthlyMap.set(month, { total: 0, new: 0, pre_owned: 0 });
    const row = monthlyMap.get(month)!;
    for (const bike of order.bikes || []) {
      row.total += 1;
      if (bike.category === "new") row.new += 1;
      else row.pre_owned += 1;
    }
  }
  const monthlyData = MONTHS.filter((m) => monthlyMap.has(m)).map((month) => ({
    month,
    ...monthlyMap.get(month)!,
  }));

  // ✅ ตารางรายละเอียด
  const detailRows = filteredOrders
    .map((order) => {
      const bikes = order.bikes || [];
      const modelLabel =
        bikes.length === 0
          ? "ไม่ระบุ"
          : bikes.length === 1
          ? bikes[0].model_name
          : `${bikes[0].model_name} +${bikes.length - 1} คัน`;
      const d = new Date(order.sale_date);
      return {
        date: d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }),
        dateSort: d.getTime(),
        modelLabel,
        paymentLabel: classifyCashOrInstallment(order.payment_method || ""),
        amount: Number(order.sale_price || 0),
      };
    })
    .sort((a, b) => b.dateSort - a.dateSort)
    .map(({ dateSort, ...rest }) => rest);

  // ✅ สรุปภาพรวม
  let totalVehicles = 0;
  let newCount = 0;
  let usedCount = 0;
  let cashCount = 0;
  let installmentCount = 0;
  let totalAmount = 0;
  for (const order of filteredOrders) {
    totalAmount += Number(order.sale_price || 0);
    const isCash = classifyCashOrInstallment(order.payment_method || "") === "เงินสด";
    for (const bike of order.bikes || []) {
      totalVehicles += 1;
      if (bike.category === "new") newCount += 1;
      else usedCount += 1;
      if (isCash) cashCount += 1;
      else installmentCount += 1;
    }
  }
  const summary = {
    totalOrders: filteredOrders.length,
    totalVehicles,
    newCount,
    usedCount,
    cashCount,
    installmentCount,
    totalAmount,
  };

  const periodLabel =
    selectedYear === "all"
      ? "ทั้งหมด"
      : selectedMonths.length === 0
      ? `ปี ${parseInt(selectedYear) + 543}`
      : `${selectedMonths.join(", ")} ${parseInt(selectedYear) + 543}`;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/reports">รายงาน</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>พิมพ์รายงานยอดขาย - {periodLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      <div className="h-[90%]">
        <ViewSalesReportPDF
          summary={summary}
          monthlyData={monthlyData}
          detailRows={detailRows}
          periodLabel={periodLabel}
        />
      </div>

      <ActionButtons
        summary={summary}
        monthlyData={monthlyData}
        detailRows={detailRows}
        periodLabel={periodLabel}
      />
    </>
  );
};

export default SalesReportPrintPage;