"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import SalesReportPDF from "@/components/pdf/SalesReportPDF";

type MonthlyRow = { month: string; total: number; new: number; pre_owned: number };
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

interface ViewSalesReportPDFProps {
  summary: SummaryData;
  monthlyData: MonthlyRow[];
  detailRows: DetailRow[];
  periodLabel: string;
}

export default function ViewSalesReportPDF({
  summary,
  monthlyData,
  detailRows,
  periodLabel,
}: ViewSalesReportPDFProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const generatePDF = async () => {
      try {
        setLoading(true);
        setError(null);

        const blob = await pdf(
          <SalesReportPDF
            summary={summary}
            monthlyData={monthlyData}
            detailRows={detailRows}
            periodLabel={periodLabel}
          />
        ).toBlob();

        if (blob.size === 0) {
          throw new Error("PDF ว่างเปล่า (0 bytes)");
        }

        objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          setPdfUrl(objectUrl);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";
        console.error("[PDF] ❌ Error:", err);
        if (isMounted) {
          setError(`ไม่สามารถสร้าง PDF ได้: ${errorMessage}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(() => {
      generatePDF();
    }, 100);

    return () => {
      clearTimeout(timer);
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [summary, monthlyData, detailRows, periodLabel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-orange-600 mb-4"></div>
          <p className="text-gray-600">กำลังสร้างรายงาน...</p>
        </div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-4">{error || "ไม่สามารถโหลด PDF ได้"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <iframe src={pdfUrl} className="w-full h-full border-0" title="Sales Report Viewer" />
    </div>
  );
}