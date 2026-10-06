"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IOrder } from "@/types/Order";
import { createOrder } from "@/services/OrderService";
import { PaymentType, TransferBank } from "../shared/PaymentSection";
import { TransactionType } from "../types";
import { ServiceItem, calculateServiceItemsTotal } from "./ServiceItems";

interface UseServiceOrderCheckoutParams {
  orderCustomer: any;
  orderBike: any;
  orderAdditionalFees: any[];
  orderGifts: any[];
  notes: string;
  resetOrder: () => void;

  transactionType: TransactionType;
  otherTransactionDetail: string;
  serviceItems: ServiceItem[];
  serviceDetail: string;

  paymentType: PaymentType;
  transferBank: TransferBank;
  checkNumber: string;

  // ✅ เลขไมล์ ณ ตอนรับบริการ (มีความหมายเฉพาะตอนมีรถผูกอยู่)
  mileage: string;
}

/**
 * Logic การสร้างออเดอร์ประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
 * (ฟอร์มแบบง่าย ไม่มีไฟแนนซ์ รถเป็นตัวเลือก ไม่บังคับ รองรับหลายรายการต่อบิล)
 * ✅ checkout เสร็จแล้วไปที่ /service-history/{id} ตรงๆ เลย (เมนู "รายการ") - ออกใบเสร็จรับเงินชั่วคราว
 * ให้อัตโนมัติทันที ไม่ผ่านหน้าเลือกเอกสาร /sales/{id}/documents ที่มีแต่ "ขาย" เท่านั้นที่ใช้
 */
export const useServiceOrderCheckout = ({
  orderCustomer,
  orderBike,
  orderAdditionalFees,
  orderGifts,
  notes,
  resetOrder,
  transactionType,
  otherTransactionDetail,
  serviceItems,
  serviceDetail,
  paymentType,
  transferBank,
  checkNumber,
  mileage,
}: UseServiceOrderCheckoutParams) => {
  const router = useRouter();

  const handleServiceCheckout = async () => {
    if (!orderCustomer) {
      toast.info("Select customer before checkout");
      return;
    }

    const validItems = serviceItems.filter(
      (item) => item.description.trim() !== "" && item.amount > 0
    );

    if (validItems.length === 0) {
      toast.info("กรุณาเพิ่มอย่างน้อย 1 รายการ พร้อมระบุราคา");
      return;
    }

    if (transactionType === "อื่นๆ" && !otherTransactionDetail.trim()) {
      toast.info("กรุณาระบุรายละเอียดประเภทงาน");
      return;
    }

    const total = calculateServiceItemsTotal(validItems);

    // ✅ รวมรายการเป็นข้อความไว้ใน notes ก่อน (ระหว่างรอ backend รองรับตารางรายการจริง)
    const itemsDescription = validItems
      .map((item) => `- ${item.description}: ${item.amount.toLocaleString()} บาท`)
      .join("\n");

    const payload = {
      customer: orderCustomer.id,
      // ✅ รถเป็นตัวเลือก ไม่บังคับ สำหรับประเภทนี้
      bikes: orderBike ? [orderBike] : [],
      // ✅ ไม่มีของแถม/ค่าใช้จ่ายเพิ่มเติมสำหรับงานประเภทนี้ (กันค่าที่ค้างจากแท็บ "ขาย" ติดมา)
      additional_fees: [],
      gifts: [],

      sale_price: total,
      deposit: 0,
      discount: 0,
      down_payment: 0,

      // ไม่มีไฟแนนซ์สำหรับประเภทนี้
      finance_amount: 0,
      interest_rate: 0,
      installment_count: 0,
      installment_amount: 0,
      finance_provider: "",
      npg_period: "",

      // ประเภทการซื้อ - ใช้ "เงินสด" เป็นค่าเริ่มต้นเสมอสำหรับงานประเภทนี้
      payment_method: "เงินสด",

      // รูปแบบการชำระ
      payment_type: paymentType,
      transfer_bank: paymentType === "เงินโอน" ? transferBank : "",
      check_number: paymentType === "เช็ค" ? checkNumber : "",

      // ✅ ประเภทธุรกรรม
      transaction_type: transactionType,
      transaction_type_detail:
        transactionType === "อื่นๆ" ? otherTransactionDetail : "",

      // ✅ เตรียมไว้ให้ backend ใช้ทีหลัง (ตอนนี้ backend ยังไม่มีตารางรองรับ จะถูกเพิกเฉย)
      service_items: validItems.map(({ description, amount }) => ({
        description,
        amount,
      })),

      notes: [serviceDetail, itemsDescription].filter(Boolean).join("\n\n") || notes,
      total,

      // ✅ เลขไมล์ - มีความหมายเฉพาะตอนมีรถผูกอยู่ ไม่งั้นส่ง null
      mileage: orderBike && mileage.trim() !== "" ? Number(mileage) : null,
    } as IOrder;

    const checkout = await createOrder(payload);
    if (checkout.status === "success") {
      const data = await checkout.data;
      const orderId = data.data;

      toast.success("บันทึกรายการสำเร็จ!");

      resetOrder();
      // ✅ ข้ามหน้าเลือกเอกสารไปเลย ไปที่เมนู "รายการ" (service-history) ออกใบเสร็จรับเงินชั่วคราวให้อัตโนมัติทันที
      router.push(`/service-history/${orderId}/TempReceipt`);
    } else {
      const error = await checkout.data;
      Object.keys(error).map((key) => {
        toast.error(`${key}: ${error[key][0]}`);
      });
    }
  };

  return { handleServiceCheckout };
};