"use client";
// page.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/service-history/[service-history_id]/TempReceipt/page.tsx
import { useMemo } from "react";
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
import { useParams } from "next/navigation";
import ViewTempReceipt, { TempReceiptData } from "./components/ViewTempReceipt";
import ActionButtons from "./components/ActionButtons";
import {
  formatDate,
  getPaymentLabel,
  getReceiptNumber,
  useServiceRecord,
} from "../components/serviceRecordUtil";

export default function TempReceiptPage() {
  const params = useParams();
  const recordId = params["service-history_id"] as string;
  const { record, loading, error } = useServiceRecord(recordId);

  // ✅ useMemo กัน ViewTempReceipt สร้าง PDF ใหม่ทุกครั้งที่ re-render
  const tempReceiptData: TempReceiptData | null = useMemo(() => {
    if (!record) return null;
    return {
      recordId: record.id,
      receiptNumber: getReceiptNumber(record.id),
      date: formatDate(record.service_date),
      customerName: record.customer || "ไม่ระบุชื่อ",
      customerAddress: record.customer_address || "",
      customerPhone: record.customer_phone || "",
      paymentMethodLabel: getPaymentLabel(record),
      items: record.items || [],
      total: Number(record.total || 0),
    };
  }, [record]);

  if (loading) {
    return <p className="text-center text-gray-400 py-12">กำลังโหลด...</p>;
  }

  if (error || !record || !tempReceiptData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "ไม่พบรายการ"}</p>
        <Link href="/service-history" className="text-sm underline">
          กลับหน้ารายการ
        </Link>
      </div>
    );
  }

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={record.bike ? `/service-history?bike=${record.bike.id}` : "/service-history"}>
                รายการ
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/service-history/${record.id}`}>{getReceiptNumber(record.id)}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>ใบเสร็จรับเงินชั่วคราว</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      <div className="h-[80vh]">
        <ViewTempReceipt data={tempReceiptData} />
      </div>

      <ActionButtons data={tempReceiptData} />
    </>
  );
}