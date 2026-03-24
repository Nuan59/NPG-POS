"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import PdiTemplate from "@/components/pdf/PdiTemplate";

interface ViewPdiProps {
  data: {
    saleId: number;
    customerName: string;
    chassisNumber: string;
    engineNumber: string;
    model: string;
    color: string;
  };
}

export default function ViewPdi({ data }: ViewPdiProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const generatePDF = async () => {
      try {
        console.log("[PDF] 🔄 เริ่มสร้าง PDI PDF...");
        console.log("[PDF] 📦 ข้อมูลที่ได้รับ:", data);
        setLoading(true);
        setError(null);

        // สร้าง PDF blob
        const blob = await pdf(
          <PdiTemplate
            customerName={data.customerName}
            chassisNumber={data.chassisNumber}
            engineNumber={data.engineNumber}
            model={data.model}
            color={data.color}
          />
        ).toBlob();

        console.log(`[PDF] ✅ สร้าง Blob สำเร็จ (ขนาด: ${blob.size} bytes)`);

        if (blob.size === 0) {
          throw new Error("PDF ว่างเปล่า (0 bytes)");
        }

        // สร้าง object URL
        objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          setPdfUrl(objectUrl);
          console.log("[PDF] 🎉 แสดง PDF สำเร็จ!");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ";
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
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-orange-600 mb-4"></div>
          <p className="text-gray-600">กำลังสร้างใบ PDI...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-4">{error || "ไม่สามารถโหลด PDF ได้"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            🔄 ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  // Success - แสดง PDF เต็มหน้าจอ
  return (
    <div className="w-full h-full">
      <iframe
        src={pdfUrl}
        className="w-full h-full border-0"
        title="PDI Viewer"
      />
    </div>
  );
}