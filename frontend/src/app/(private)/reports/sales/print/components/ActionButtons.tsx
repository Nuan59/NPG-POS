"use client";

import PdfLoading from "@/components/pdf/PdfLoading";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import SalesReportPDF from "@/components/pdf/SalesReportPDF";

// ✅ ต้องประกาศ dynamic() ที่ module scope เท่านั้น (เหมือนหน้าการเงิน) ห้ามอยู่ในตัว component
// ไม่งั้นทุกครั้งที่ re-render จะสร้าง component ใหม่ซ้ำๆ ทำให้ React unmount/remount วนจนพัง
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <PdfLoading /> }
);

type MonthlyRow = { month: string; total: number; new: number; pre_owned: number };
type ModelRow = { model_name: string; count: number };
type DetailRow = { date: string; modelLabel: string; paymentLabel: string; amount: number };
type SummaryData = {
  totalOrders: number;
  totalVehicles: number;
  newCount: number;
  usedCount: number;
  cashCount: number;
  installmentCount: number;
  totalAmount: number;
};

interface ActionButtonsProps {
  summary: SummaryData;
  monthlyData: MonthlyRow[];
  modelData: ModelRow[];
  detailRows: DetailRow[];
  periodLabel: string;
}

const ActionButtons = ({ summary, monthlyData, modelData, detailRows, periodLabel }: ActionButtonsProps) => {
  return (
    <div className="flex justify-between container mt-2">
      <Link href={`/reports`}>
        <Button variant={"outline"}>Return</Button>
      </Link>
      <PDFDownloadLink
        fileName={`รายงานยอดขาย-${periodLabel.replace(/\s+/g, "-")}.pdf`}
        document={
          <SalesReportPDF
            summary={summary}
            monthlyData={monthlyData}
            modelData={modelData}
            detailRows={detailRows}
            periodLabel={periodLabel}
          />
        }
      >
        <Button className="flex justify-between gap-2">
          <Printer size={"1.2rem"} opacity={"60%"} />
          Print
        </Button>
      </PDFDownloadLink>
    </div>
  );
};

export default ActionButtons;