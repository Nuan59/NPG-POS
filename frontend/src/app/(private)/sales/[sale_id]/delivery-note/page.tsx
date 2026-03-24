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
import ViewDeliveryNote from "./components/ViewDeliveryNote";
import ActionButtons from "./components/ActionButtons";
import { getOrder } from "@/services/OrderService";
import { IOrder } from "@/types/Order";

// ป้องกัน cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DeliveryNoteParams {
  params: {
    sale_id: string;
  };
}

const DeliveryNotePage = async ({ params }: DeliveryNoteParams) => {
  const saleId = Number.parseInt(params.sale_id, 10);
  if (Number.isNaN(saleId)) {
    notFound();
  }

  // ใช้ getOrder service เหมือนหน้า receipt
  const res = await getOrder(saleId);
  if (!res?.ok) {
    notFound();
  }

  const order = (await res.json()) as IOrder;
  if (!order?.id) {
    notFound();
  }

  const documentID = `${order.id}`.padStart(8, "0");

  // ✅ แปลงวันที่เป็น dd-mm-yyyy
  const formatDate = (dateString: string) => {
    if (!dateString) return new Date().toLocaleDateString('th-TH');
    
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
      return dateString;
    }
  };

  // ✅ ดึงข้อมูลลูกค้าจาก root level (Backend ส่งมาแบบ flat)
  const customerName = (order as any).customer || "ไม่ระบุชื่อ";
  const customerPhone = (order as any).customer_phone || "ไม่ระบุเบอร์";
  
  // ต่อที่อยู่ให้ครบถ้วน
  let customerAddress = (order as any).customer_address || '';
  const subdistrict = (order as any).customer_subdistrict;
  const district = (order as any).customer_district;
  const province = (order as any).customer_province;
  const postalCode = (order as any).customer_postal_code;
  
  if (customerAddress && subdistrict) {
    customerAddress += ` ต.${subdistrict}`;
  } else if (subdistrict) {
    customerAddress = `ต.${subdistrict}`;
  }
  
  if (district) customerAddress += ` อ.${district}`;
  if (province) customerAddress += ` จ.${province}`;
  if (postalCode) customerAddress += ` ${postalCode}`;
  
  customerAddress = customerAddress.trim() || "ไม่ระบุที่อยู่";

  // เตรียมข้อมูลสำหรับ Delivery Note
  const deliveryData = {
    saleId: order.id,
    customerName: customerName,
    address: customerAddress,
    phone: customerPhone,
    date: formatDate(order.sale_date),
    vehicles: order.bikes || [],
  };

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
            <BreadcrumbPage>ใบส่งมอบ</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      {/* PDF Viewer */}
      <div className="h-[90%]">
        <ViewDeliveryNote data={deliveryData} />
      </div>

      {/* ปุ่ม Return และ Print */}
      <ActionButtons data={deliveryData} />
    </>
  );
};

export default DeliveryNotePage;