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
import { notFound } from "next/navigation";
import { getOrder } from "@/services/OrderService";
import { IOrder } from "@/types/Order";
import ActionButtons from "./components/ActionButtons";
import { formatDate, getNotesWithoutItems, parseItemsFromNotes } from "./components/serviceRecordUtil";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ServiceHistoryDetailParams {
  params: {
    "service-history_id": string;
  };
}

const transactionBadgeStyle: Record<string, string> = {
  "ขาย": "bg-blue-100 text-blue-800",
  "ซ่อม": "bg-orange-100 text-orange-800",
  "ต่อภาษี+พรบ": "bg-purple-100 text-purple-800",
  "อื่นๆ": "bg-gray-100 text-gray-800",
};

const ServiceHistoryDetailPage = async ({ params }: ServiceHistoryDetailParams) => {
  const recordId = Number.parseInt(params["service-history_id"], 10);
  if (Number.isNaN(recordId)) notFound();

  const res = await getOrder(recordId);
  if (!res?.ok) notFound();

  const order = (await res.json()) as IOrder;
  if (!order?.id) notFound();

  const o = order as any;
  const documentID = `${order.id}`.padStart(8, "0");
  const type: string = o.transaction_type || "ขาย";
  const typeLabel = type === "อื่นๆ" && o.transaction_type_detail ? o.transaction_type_detail : type;
  const total = Number(order.total || 0);
  const items = parseItemsFromNotes(order.notes, typeLabel, total);
  const extraNotes = getNotesWithoutItems(order.notes);

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/service-history">รายการ</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>O-{documentID}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      <div className="max-w-3xl space-y-4">
        <div className="bg-white rounded-xl shadow-md p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                transactionBadgeStyle[type] || "bg-gray-100 text-gray-800"
              }`}
            >
              {typeLabel}
            </span>
            <span className="text-sm text-gray-500">{formatDate(o.sale_date)}</span>
          </div>

          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-gray-500">ลูกค้า</span>
            <span>{o.customer || "ไม่ระบุชื่อ"}</span>
            {!!o.mileage && (
              <>
                <span className="text-gray-500">เลขไมล์</span>
                <span>{Number(o.mileage).toLocaleString()} กม.</span>
              </>
            )}
            <span className="text-gray-500">การชำระเงิน</span>
            <span>{order.payment_type || order.payment_method || "-"}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="font-semibold mb-3">รายการ</h2>
          <div className="divide-y">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between py-2 text-sm">
                <span>{item.description}</span>
                <span>฿{Number(item.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-3 mt-2 border-t font-semibold">
            <span>รวมทั้งสิ้น</span>
            <span>฿{total.toLocaleString()}</span>
          </div>
          {extraNotes && (
            <p className="text-xs text-gray-500 mt-3 whitespace-pre-wrap">{extraNotes}</p>
          )}
        </div>

        <ActionButtons order={order} />
      </div>
    </>
  );
};

export default ServiceHistoryDetailPage;