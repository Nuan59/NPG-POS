// FinancialPrintPreviewDialog.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/FinancialPrintPreviewDialog.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PdfLoading from "@/components/pdf/PdfLoading";
import { FinancialData, ModelData, OverviewData } from "../util/financialTypes";

/**
 * ✅ Error Boundary กันไม่ให้ error ตอน render PDF preview ทำให้ทั้งหน้าพัง/refresh
 * (React error ที่ไม่มีใครจับจะ bubble ขึ้นไปจน Next.js reset ทั้ง route
 *  ดูเหมือนหน้าเว็บ refresh ทั้งที่จริงๆ ไม่ใช่ - ห่อ boundary ไว้จะเห็น error message จริงแทน)
 */
class PDFPreviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[PDFPreviewErrorBoundary] จับ error ได้:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center max-w-xl">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              สร้างตัวอย่างรายงานไม่สำเร็จ
            </h2>
            <p className="text-gray-600 mb-2 break-words">
              {this.state.error.message || String(this.state.error)}
            </p>
            <p className="text-xs text-gray-400">
              (ดู stack trace เต็มได้ใน Console)
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ✅ ต้องประกาศ dynamic() ที่ module scope เท่านั้น ห้ามอยู่ในตัว component
// (เดิมอยู่ในตัว component ทำให้ทุกครั้งที่ re-render เช่นตอนกด "พิมพ์รายงาน"
//  จะสร้าง component ใหม่ทั้ง 3 ตัวซ้ำๆ ทำให้ React unmount/remount วนซ้ำจนพังและหน้าเว็บ refresh)
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <PdfLoading /> }
);
const FinancialReportPDF = dynamic(
  () => import("@/components/pdf/FinancialReportPDF"),
  { ssr: false }
);
const ViewFinancialReportPDF = dynamic(
  () => import("../financial/print/components/ViewFinancialReportPDF"),
  { ssr: false }
);

interface FinancialPrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overview: OverviewData;
  monthlyData: FinancialData[];
  modelData: ModelData[];
  periodLabel: string;
}

const FinancialPrintPreviewDialog = ({
  open,
  onOpenChange,
  overview,
  monthlyData,
  modelData,
  periodLabel,
}: FinancialPrintPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>ตัวอย่างรายงานการเงิน - {periodLabel}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {open && (
            <PDFPreviewErrorBoundary>
              <ViewFinancialReportPDF
                overview={overview}
                monthlyData={monthlyData}
                modelData={modelData}
                periodLabel={periodLabel}
              />
            </PDFPreviewErrorBoundary>
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ปิด
          </Button>
          <PDFDownloadLink
            fileName={`รายงานการเงิน-${periodLabel.replace(/\s+/g, "-")}.pdf`}
            document={
              <FinancialReportPDF
                overview={overview}
                monthlyData={monthlyData}
                modelData={modelData}
                periodLabel={periodLabel}
              />
            }
          >
            <Button className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              ดาวน์โหลด / พิมพ์
            </Button>
          </PDFDownloadLink>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FinancialPrintPreviewDialog;