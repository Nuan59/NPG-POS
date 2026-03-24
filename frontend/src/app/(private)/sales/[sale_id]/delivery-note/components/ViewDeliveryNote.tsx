"use client";

import { useEffect, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import DeliveryNoteTemplate from "@/components/pdf/DeliveryNoteTemplate";

interface Vehicle {
  brand: string;
  model_name: string;
  model_code: string;
  engine: string;
  chassi: string;
  color: string;
}

interface DeliveryData {
  saleId: number;
  customerName: string;
  address: string;
  phone: string;
  date: string;
  vehicles: Vehicle[];
}

interface Props {
  data: DeliveryData;
}

export default function ViewDeliveryNote({ data }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const generatePDF = async () => {
      try {
        console.log("[PDF] 🔄 เริ่มสร้าง Delivery Note PDF...");
        console.log("[PDF] 📦 ข้อมูลที่ได้รับ:", data);
        setLoading(true);
        setError(null);

        // ✅ ไม่ต้องแปลง format - ส่งข้อมูลตรง ๆ
        const blob = await pdf(
          <DeliveryNoteTemplate
            customerName={data.customerName}
            address={data.address}
            phone={data.phone}
            date={data.date}
            vehicles={data.vehicles.map(v => ({
              brand: v.brand || "",
              model: v.model_name || "",
              modelCode: v.model_code || "",
              engineNo: v.engine || "",
              frameNo: v.chassi || "",
              color: v.color || "",
            }))}
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
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-orange-600 mb-4"></div>
          <p className="text-gray-600">กำลังสร้างใบส่งมอบ...</p>
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
        title="Delivery Note Viewer"
      />
    </div>
  );
}