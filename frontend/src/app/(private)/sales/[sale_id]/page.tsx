import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { getOrder } from "@/services/OrderService";
import { IOrder } from "@/types/Order";
import {
  Calendar,
  Frown,
  User,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import ActionButtons from "./components/ActionButtons";

interface ViewOrderParams {
  params: {
    sale_id: string;
  };
}

const ViewOrder = async ({ params }: ViewOrderParams) => {
  const order = (await getOrder(parseInt(params.sale_id)).then((res) => {
    if (!res?.ok) {
      return null;
    }
    return res.json();
  })) as IOrder;

  if (order === null) {
    return (
      <div className="grid place-items-center h-full w-full">
        <div className="flex items-center justify-center flex-col gap-3">
          <Frown size={"6rem"} opacity={"60%"} />
          <h1>ไม่พบรายการขายนี้</h1>
          <Link href={"/sales"}>
            <Button>ย้อนกลับ</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getDate = (date: Date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const documentID = `${order.id}`.padStart(8, "0");

  const orderBike = order.bikes[0];
  const data = [
    { label: "ยี่ห้อ", data: orderBike.brand },
    { label: "ชื่อรุ่น", data: orderBike.model_name },
    { label: "สี", data: orderBike.color },
    { label: "รหัสรุ่น", data: orderBike.model_code },
    { label: "เลขเครื่อง", data: orderBike.engine },
    { label: "เลขตัวถัง", data: orderBike.chassi },
    { label: "ป้ายทะเบียน", data: orderBike.registration_plate },
    { label: "บันทึกเพิ่มเติม", data: orderBike.notes },
    { label: "ชนิดรถ", data: orderBike.category === "new" ? "รถใหม่" : "รถมือสอง" },
  ];

  const salesperson = order.salesperson || "ไม่ระบุ";

  // ✅ ข้อมูลการเงิน
  const salePrice = Number(order.sale_price) || 0;
  const deposit = Number(order.deposit) || 0;
  const discount = Number(order.discount) || 0;
  const downPayment = Number(order.down_payment) || 0;
  const financeAmount = Number(order.finance_amount) || 0;
  const interestRate = Number(order.interest_rate) || 0;
  const installmentCount = Number(order.installment_count) || 0;
  const installmentAmount = Number(order.installment_amount) || 0;

  // ✅ คำนวณยอดรวมค่าใช้จ่ายเพิ่มเติม
  let additionalFeesTotal = 0;
  if (order.additional_fees && Array.isArray(order.additional_fees)) {
    additionalFeesTotal = order.additional_fees.reduce((sum, fee) => {
      const amount = Number(fee.amount) || 0;
      return sum + amount;
    }, 0);
  }

  // ✅ ตรวจสอบว่าเป็นไฟแนนซ์หรือไม่
  const isFinance = 
    order.payment_method === "Cathay" || 
    order.payment_method === "ทรัพย์สยาม" || 
    order.payment_method === "NPG";

  // ✅ คำนวณยอดชำระรวมทั้งหมด
  let calculatedTotal = 0;
  
  if (isFinance) {
    // กรณีไฟแนนซ์: เงินดาวน์ + ค่าใช้จ่ายเพิ่มเติม - มัดจำ - ส่วนลด
    calculatedTotal = downPayment + additionalFeesTotal - deposit - discount;
  } else {
    // กรณีเงินสด: ราคาสินค้า + ค่าใช้จ่ายเพิ่มเติม - มัดจำ - ส่วนลด
    calculatedTotal = salePrice + additionalFeesTotal - deposit - discount;
  }

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
            <BreadcrumbPage>PH-{documentID}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Separator className="my-2" />

      <div className="py-2 grid grid-cols-2 gap-x-5">
        <div>
          <h2 className="text-3xl font-semibold prompt">
            การขาย PH-{documentID}
          </h2>
        </div>

        <div className="justify-self-end flex flex-col gap-2 items-end">
          <h3 className="text-xl flex items-center justify-between gap-2">
            <User opacity={"60%"} />
            {order.customer}
          </h3>
          <h4 className="flex items-center justify-between gap-2">
            <Calendar opacity={"60%"} />
            {getDate(order.sale_date)}
          </h4>
          <h4 className="flex items-center justify-between gap-2">
            <UserCheck opacity={"60%"} />
            <span className="text-sm text-muted-foreground">
              ผู้ขาย: {salesperson}
            </span>
          </h4>
        </div>

        <div>
          <h4 className="text-lg">ข้อมูลสินค้า</h4>
          <ScrollArea className="h-[80%] w-full rounded-md mt-3">
            <Table>
              <TableCaption>ข้อมูลรายการขาย PH-{documentID}</TableCaption>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right">{row.data}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="relative">
          <Separator orientation="vertical" className="absolute h-[85%]" />

          <div className="container flex flex-col justify-between h-[85%] overflow-y-auto">

            {/* ✅ ค่าใช้จ่ายเพิ่มเติม */}
            {order.additional_fees?.length! > 0 && (
              <div className="mb-3">
                <h4 className="text-lg">ค่าใช้จ่ายเพิ่มเติม</h4>
                <div className="max-h-[100px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full">
                  <Table>
                    <TableBody>
                      {order.additional_fees?.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell className="font-medium">
                            {fee.description}
                          </TableCell>
                          <TableCell className="font-medium text-right">
                            {Number(fee.amount || 0).toLocaleString()} บาท
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* ✅ ของแถม */}
            {order.gifts?.length! > 0 && (
              <div className="mb-3">
                <h4 className="text-lg">ของแถม</h4>
                <div className="max-h-[100px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full">
                  <Table>
                    <TableBody>
                      {order.gifts?.map((gift) => (
                        <TableRow key={gift.id}>
                          <TableCell className="font-medium">
                            {gift.name}
                          </TableCell>
                          <TableCell className="font-medium text-right">
                            {gift.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* ✅ ข้อมูลการขาย - รวมทั้งหมดไว้ที่นี่ */}
            <div className="mb-3">
              <h4 className="text-lg">ข้อมูลการขาย</h4>
              <Table>
                <TableBody>
                  {/* เงื่อนไขการชำระ */}
                  <TableRow>
                    <TableCell className="font-medium">เงื่อนไขการชำระ</TableCell>
                    <TableCell className="font-medium text-right">
                      {order.payment_method}
                    </TableCell>
                  </TableRow>

                  {/* ราคาสินค้า */}
                  <TableRow>
                    <TableCell className="font-medium">ราคาสินค้า</TableCell>
                    <TableCell className="font-medium text-right">
                      {salePrice.toLocaleString()} บาท
                    </TableCell>
                  </TableRow>

                  {/* มัดจำ */}
                  {deposit > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">มัดจำ</TableCell>
                      <TableCell className="font-medium text-right">
                        {deposit.toLocaleString()} บาท
                      </TableCell>
                    </TableRow>
                  )}

                  {/* ส่วนลด */}
                  <TableRow>
                    <TableCell className="font-medium">ส่วนลด</TableCell>
                    <TableCell className="font-medium text-right">
                      {discount.toLocaleString()} บาท
                    </TableCell>
                  </TableRow>

                  {/* เงินดาวน์ */}
                  <TableRow>
                    <TableCell className="font-medium">เงินดาวน์</TableCell>
                    <TableCell className="font-medium text-right">
                      {downPayment.toLocaleString()} บาท
                    </TableCell>
                  </TableRow>

                  {/* ถ้าเป็นไฟแนนซ์ แสดงข้อมูลเพิ่ม */}
                  {isFinance && (
                    <>
                      {/* ยอดจัด */}
                      <TableRow>
                        <TableCell className="font-medium">ยอดจัด</TableCell>
                        <TableCell className="font-medium text-right">
                          {financeAmount.toLocaleString()} บาท
                        </TableCell>
                      </TableRow>

                      {/* ดอกเบี้ย (รายเดือน) */}
                      {interestRate > 0 && (
                        <TableRow>
                          <TableCell className="font-medium">ดอกเบี้ย (รายเดือน)</TableCell>
                          <TableCell className="font-medium text-right">
                            {interestRate}%
                          </TableCell>
                        </TableRow>
                      )}

                      {/* จำนวนงวด */}
                      {installmentCount > 0 && (
                        <TableRow>
                          <TableCell className="font-medium">จำนวนงวด</TableCell>
                          <TableCell className="font-medium text-right">
                            {installmentCount} งวด
                          </TableCell>
                        </TableRow>
                      )}

                      {/* ค่างวด */}
                      {installmentAmount > 0 && (
                        <TableRow>
                          <TableCell className="font-medium">ค่างวด</TableCell>
                          <TableCell className="font-medium text-right">
                            {installmentAmount.toLocaleString()} บาท
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}

                  {/* หมายเหตุ */}
                  {order.notes && (
                    <TableRow>
                      <TableCell className="font-medium">หมายเหตุ</TableCell>
                      <TableCell className="font-medium text-right">
                        {order.notes}
                      </TableCell>
                    </TableRow>
                  )}

                  {/* ยอดรวมชำระทั้งหมด */}
                  <TableRow className="bg-slate-100">
                    <TableCell className="font-bold">ยอดรวมชำระทั้งหมด</TableCell>
                    <TableCell className="font-bold text-right">
                      {calculatedTotal.toLocaleString()} บาท
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Separator className="my-5" />
            </div>

            <ActionButtons order={order} />
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewOrder;