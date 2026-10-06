// page.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/service-history/[service-history_id]/TempReceipt/page.tsx
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
import ViewTempReceipt, { TempReceiptData } from "./components/ViewTempReceipt";
import ActionButtons from "./components/ActionButtons";
import { formatDate, parseItemsFromNotes } from "../components/serviceRecordUtil";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface TempReceiptPageParams {
  params: {
    "service-history_id": string;
  };
}

const TempReceiptPage = async ({ params }: TempReceiptPageParams) => {
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

  const tempReceiptData: TempReceiptData = {
    recordId: order.id,
    receiptNumber: `O-${documentID}`,
    date: formatDate(o.sale_date),
    customerName: o.customer || "ไม่ระบุชื่อ",
    customerAddress: o.customer_address || "",
    customerPhone: o.customer_phone || "",
    paymentMethodLabel: order.payment_type || order.payment_method || "",
    items: parseItemsFromNotes(order.notes, typeLabel, total),
    total,
  };

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
            <BreadcrumbLink asChild>
              <Link href={`/service-history/${order.id}`}>O-{documentID}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>ใบเสร็จรับเงินชั่วคราว</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      <div className="h-[90%]">
        <ViewTempReceipt data={tempReceiptData} />
      </div>

      <ActionButtons data={tempReceiptData} />
    </>
  );
};

export default TempReceiptPage;