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
import ViewPDPAConsent from "./components/ViewPDPAConsent";
import ActionButtons from "./components/ActionButtons";
import { getCustomer } from "@/services/CustomerService";

// ป้องกัน cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PDPAConsentParams {
  params: {
    customer_id: string;
  };
}

const PDPAConsentPage = async ({ params }: PDPAConsentParams) => {
  const customerId = Number.parseInt(params.customer_id, 10);
  if (Number.isNaN(customerId)) {
    notFound();
  }

  // ✅ ใช้ getCustomer service (เหมือน Receipt ใช้ getOrder)
  const res = await getCustomer(customerId);
  
  if (!res?.ok || !res.data) {
    notFound();
  }

  const customer = res.data;

  // ✅ สร้างที่อยู่เต็ม
  let fullAddress = customer.address || '';
  
  if (customer.subdistrict) {
    fullAddress += ` ต.${customer.subdistrict}`;
  }
  if (customer.district) {
    fullAddress += ` อ.${customer.district}`;
  }
  if (customer.province) {
    fullAddress += ` จ.${customer.province}`;
  }
  if (customer.postal_code) {
    fullAddress += ` ${customer.postal_code}`;
  }
  
  fullAddress = fullAddress.trim() || "ไม่ระบุที่อยู่";

  // เตรียมข้อมูลสำหรับ PDF
  const pdpaData = {
    customerId: customer.id,
    customerName: customer.name || "ไม่ระบุชื่อ",
    address: fullAddress,
    phone: customer.phone || "ไม่ระบุเบอร์",
  };

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/customers">ลูกค้า</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/customers/${customer.id}`}>
                {customer.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>ใบยินยอม PDPA</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      {/* PDF Viewer */}
      <div className="h-[90%]">
        <ViewPDPAConsent data={pdpaData} />
      </div>

      {/* ปุ่ม Return และ Print */}
      <ActionButtons data={pdpaData} />
    </>
  );
};

export default PDPAConsentPage;