import { getOrder } from "@/services/OrderService";
import { IOrder } from "@/types/Order";
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
import ViewReceipt from "./components/ViewReceipt";
import ActionButtons from "./components/ActionButtons";

// กัน cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ViewReceiptParams {
  params: {
    sale_id: string;
  };
}

const SaleReceipt = async ({ params }: ViewReceiptParams) => {
  const saleId = Number.parseInt(params.sale_id, 10);
  if (Number.isNaN(saleId)) {
    notFound();
  }

  const res = await getOrder(saleId);
  if (!res?.ok) {
    notFound();
  }

  const order = (await res.json()) as IOrder;
  if (!order?.id) {
    notFound();
  }

  const documentID = `${order.id}`.padStart(8, "0");

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/sales">ประวัติการขาย</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/sales/${order.id}`}>PH-{documentID}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>ใบเสร็จรับเงิน</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      {/* PDF Viewer */}
      <div className="h-[90%]">
        <ViewReceipt order={order} />
      </div>

      {/* ปุ่ม Return และ Print */}
      <ActionButtons order={order} />
    </>
  );
};

export default SaleReceipt;