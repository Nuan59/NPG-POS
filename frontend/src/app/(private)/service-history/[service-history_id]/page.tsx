"use client";
// page.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/service-history/[service-history_id]/page.tsx
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
import ActionButtons from "./components/ActionButtons";
import {
  formatDate,
  getPaymentLabel,
  getReceiptNumber,
  getTypeLabel,
  transactionBadgeStyle,
  useServiceRecord,
} from "./components/serviceRecordUtil";

export default function ServiceHistoryDetailPage() {
  const params = useParams();
  const recordId = params["service-history_id"] as string;
  const { record, loading, error } = useServiceRecord(recordId);

  if (loading) {
    return <p className="text-center text-gray-400 py-12">กำลังโหลด...</p>;
  }

  if (error || !record) {
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
            <BreadcrumbPage>{getReceiptNumber(record.id)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      <div className="max-w-3xl space-y-4">
        <div className="bg-white rounded-xl shadow-md p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                transactionBadgeStyle[record.transaction_type] || "bg-gray-100 text-gray-800"
              }`}
            >
              {getTypeLabel(record)}
            </span>
            <span className="text-sm text-gray-500">{formatDate(record.service_date)}</span>
          </div>

          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-gray-500">ลูกค้า</span>
            <span>{record.customer || "ไม่ระบุชื่อ"}</span>
            {record.bike && (
              <>
                <span className="text-gray-500">รถ</span>
                <span>
                  {record.bike.model_name}
                  {record.bike.registration_plate ? ` • ${record.bike.registration_plate}` : ""}
                </span>
              </>
            )}
            {!!record.mileage && (
              <>
                <span className="text-gray-500">เลขไมล์</span>
                <span>{Number(record.mileage).toLocaleString()} กม.</span>
              </>
            )}
            <span className="text-gray-500">การชำระเงิน</span>
            <span>{getPaymentLabel(record)}</span>
            {record.created_by && (
              <>
                <span className="text-gray-500">ผู้บันทึก</span>
                <span>{record.created_by}</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="font-semibold mb-3">รายการ</h2>
          <div className="divide-y">
            {(record.items || []).map((item, i) => (
              <div key={i} className="flex justify-between py-2 text-sm">
                <span>{item.description}</span>
                <span>฿{Number(item.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-3 mt-2 border-t font-semibold">
            <span>รวมทั้งสิ้น</span>
            <span>฿{Number(record.total).toLocaleString()}</span>
          </div>
          {record.notes && (
            <p className="text-xs text-gray-500 mt-3 whitespace-pre-wrap">{record.notes}</p>
          )}
        </div>

        <ActionButtons record={record} />
      </div>
    </>
  );
}