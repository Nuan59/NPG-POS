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
import ViewPdi from "./components/ViewPdi";
import ActionButtons from "./components/ActionButtons";
import { getOrder } from "@/services/OrderService";
import { IOrder } from "@/types/Order";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PdiPageParams {
  params: {
    sale_id: string;
  };
}

const PdiPage = async ({ params }: PdiPageParams) => {
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

  const orderBike = order.bikes?.[0];
  
  const pdiData = {
    saleId: order.id,
    customerName: order.customer || "ไม่ระบุชื่อ",
    chassisNumber: orderBike?.chassi || "",
    engineNumber: orderBike?.engine || "",
    model: orderBike?.model_name || "",
    color: orderBike?.color || "",
  };

  return (
    <>
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
            <BreadcrumbPage>ใบ PDI</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      <div className="h-[90%]">
        <ViewPdi data={pdiData} />
      </div>

      <ActionButtons data={pdiData} />
    </>
  );
};

export default PdiPage;