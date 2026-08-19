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
import ViewFinancialReportPDF from "./components/ViewFinancialReportPDF";
import ActionButtons from "./components/ActionButtons";
import {
  getFinancialSummary,
  getFinancialByModel,
} from "@/services/FinancialReportsService";
import { fillMissingMonths } from "@/util/reports/index";

// ป้องกัน cache เพราะข้อมูลการเงินต้องเป็นปัจจุบันเสมอ
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FinancialReportPrintPageProps {
  searchParams: {
    year?: string; // ปี ค.ศ. เช่น "2026" หรือ "all"
    month?: string; // ชื่อเดือนไทย เช่น "มกราคม" หรือ "all"
    mode?: string; // "month" | "year"
  };
}

const FinancialReportPrintPage = async ({
  searchParams,
}: FinancialReportPrintPageProps) => {
  const viewMode = searchParams.mode === "year" ? "year" : "month";
  const selectedYear = searchParams.year || "all";
  const selectedMonth = searchParams.month || "all";

  // ✅ ดึงข้อมูลรายเดือนทั้งหมด แล้วกรอง/รวมยอดฝั่ง server ให้ตรงกับตัวกรองที่เลือกมา
  const summaryRes = await getFinancialSummary();
  const monthlyDataAll = fillMissingMonths(summaryRes.data || []);

  let monthlyData: any[];

  if (viewMode === "month") {
    monthlyData = monthlyDataAll.filter((d: any) => {
      const matchesYear = selectedYear === "all" || String(d.year) === selectedYear;
      const matchesMonth = selectedMonth === "all" || d.month === selectedMonth;
      return matchesYear && matchesMonth;
    });
  } else {
    // ✅ โหมดรายปี: รวมยอดแต่ละเดือนเป็นยอดต่อปี
    const map = new Map<string, any>();
    monthlyDataAll.forEach((d: any) => {
      const y = String(d.year);
      if (selectedYear !== "all" && y !== selectedYear) return;
      if (!map.has(y)) {
        map.set(y, {
          year: y,
          month: `ปี ${parseInt(y) + 543}`,
          revenue: 0,
          cost: 0,
          additional_fees: 0,
          gross_profit: 0,
          net_profit: 0,
          order_count: 0,
        });
      }
      const acc = map.get(y);
      acc.revenue += d.revenue || 0;
      acc.cost += d.cost || 0;
      acc.additional_fees += d.additional_fees || 0;
      acc.order_count += d.order_count || 0;
    });
    monthlyData = Array.from(map.values()).sort(
      (a, b) => Number(a.year) - Number(b.year)
    );
    monthlyData.forEach((a) => {
      a.gross_profit = a.revenue - a.cost;
      a.net_profit = a.gross_profit - a.additional_fees;
    });
  }

  // ✅ ตารางแยกตามรุ่นรถ กรองตามปี/เดือนเดียวกับที่เลือกในหน้ารายงาน
  const modelRes = await getFinancialByModel(
    selectedYear !== "all" ? selectedYear : undefined,
    viewMode === "month" && selectedMonth !== "all" ? selectedMonth : undefined
  );
  const modelData = modelRes.data || [];

  // ✅ สรุปภาพรวมคำนวณจากข้อมูลที่กรองแล้ว (ตรงกับสิ่งที่แสดงบนหน้าเว็บ)
  const overview = monthlyData.reduce(
    (acc: any, d: any) => {
      acc.total_revenue += d.revenue || 0;
      acc.total_cost += d.cost || 0;
      acc.total_additional_fees += d.additional_fees || 0;
      acc.total_orders += d.order_count || 0;
      return acc;
    },
    {
      total_revenue: 0,
      total_cost: 0,
      total_additional_fees: 0,
      gross_profit: 0,
      net_profit: 0,
      profit_margin: 0,
      total_orders: 0,
      average_profit_per_order: 0,
    }
  );
  overview.gross_profit = overview.total_revenue - overview.total_cost;
  overview.net_profit = overview.gross_profit - overview.total_additional_fees;
  overview.profit_margin =
    overview.total_revenue > 0
      ? (overview.net_profit / overview.total_revenue) * 100
      : 0;
  overview.average_profit_per_order =
    overview.total_orders > 0 ? overview.net_profit / overview.total_orders : 0;

  const periodLabel =
    viewMode === "year"
      ? selectedYear === "all"
        ? "เปรียบเทียบรายปี (ทั้งหมด)"
        : `ปี ${parseInt(selectedYear) + 543}`
      : selectedYear === "all"
      ? "ทั้งหมด"
      : selectedMonth === "all"
      ? `ปี ${parseInt(selectedYear) + 543}`
      : `${selectedMonth} ${parseInt(selectedYear) + 543}`;

  const reportData = {
    overview,
    monthlyData,
    modelData,
    periodLabel,
  };

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/reports">รายงาน</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>พิมพ์รายงานการเงิน - {periodLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      {/* PDF Viewer */}
      <div className="h-[90%]">
        <ViewFinancialReportPDF
          overview={reportData.overview}
          monthlyData={reportData.monthlyData}
          modelData={reportData.modelData}
          periodLabel={reportData.periodLabel}
        />
      </div>

      {/* ปุ่ม กลับ / ดาวน์โหลด */}
      <ActionButtons data={reportData} />
    </>
  );
};

export default FinancialReportPrintPage;