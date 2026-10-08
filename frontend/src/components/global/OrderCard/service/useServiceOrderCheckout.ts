"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { toast } from "sonner";
import { PaymentType, TransferBank } from "../shared/PaymentSection";
import { TransactionType } from "../types";
import { ServiceItem } from "./ServiceItems";
import { getErrorMessage, toNumber } from "../shared/Financecalculations";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  splitCash: string;

  mileage: string;
}

/**
 * บันทึกงาน "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
 * ✅ แยกขาดจากงานขาย - ส่งไปที่ /service/ (ตาราง service_record) ไม่ใช่ /order/
 *    ผูกรถเป็นประวัติอย่างเดียว ไม่แตะสถานะ sold / สต็อก
 * ✅ บังคับเลือกรถทุกประเภท แล้วเด้งไปหน้าประวัติรถคันนั้น
 * ✅ ตรวจก่อนส่ง (validationMessage ใช้โชว์ใต้ปุ่มได้ทันที) + กันกดซ้ำ + จัดการ error
 */
export const useServiceOrderCheckout = ({
  orderCustomer,
  orderBike,
  notes,
  resetOrder,
  transactionType,
  otherTransactionDetail,
  serviceItems,
  serviceDetail,
  paymentType,
  transferBank,
  checkNumber,
  splitCash,
  mileage,
}: UseServiceOrderCheckoutParams) => {
  const router = useRouter();
  // ✅ กันกดซ้ำ - ref เช็คทันที + state ไว้ล็อกปุ่ม
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validItems = serviceItems.filter((item) => item.description.trim() !== "" && item.amount > 0);
  const itemsTotal = validItems.reduce((sum, i) => sum + i.amount, 0);
  const splitCashNumber = toNumber(splitCash);

  /** ตรวจข้อมูลก่อนส่ง - คืนข้อความผิดพลาด หรือ "" ถ้าผ่าน */
  const validate = (): string => {
    if (!orderCustomer) return "กรุณาเลือกลูกค้าก่อนบันทึกรายการ";
    if (!orderBike?.id) return "กรุณาเลือกรถก่อนบันทึกรายการ";
    if (transactionType === "อื่นๆ" && !otherTransactionDetail.trim()) return "กรุณาระบุรายละเอียดประเภทงาน";
    if (validItems.length === 0) return "กรุณาเพิ่มอย่างน้อย 1 รายการ พร้อมระบุราคา";

    // ✅ ต้องเลือกรูปแบบการชำระ (ระบบส่งเงินสดใช้ค่านี้ตัดสินว่าต้องส่งเงินไหม)
    if (!paymentType) return "กรุณาเลือกรูปแบบการชำระ";
    if ((paymentType === "เงินโอน" || paymentType === "แบ่งจ่าย") && !transferBank) {
      return "กรุณาเลือกธนาคารที่โอนเข้า";
    }
    if (paymentType === "เช็ค" && !checkNumber.trim()) return "กรุณากรอกเลขที่เช็ค";
    // แบ่งจ่าย - เงินสดต้องมากกว่า 0 และน้อยกว่ายอดรวม (ที่เหลือคือโอน)
    if (paymentType === "แบ่งจ่าย" && (splitCashNumber <= 0 || splitCashNumber >= itemsTotal)) {
      return `แบ่งจ่าย: กรอกยอดเงินสดให้มากกว่า 0 และน้อยกว่า ฿${itemsTotal.toLocaleString()}`;
    }
    return "";
  };

  const validationMessage = validate();

  const handleServiceCheckout = async () => {
    if (submittingRef.current) return;

    const error = validate();
    if (error) {
      toast.info(error);
      return;
    }

    const payload = {
      customer: orderCustomer.id,
      bike: orderBike.id,
      transaction_type: transactionType,
      transaction_type_detail: transactionType === "อื่นๆ" ? otherTransactionDetail.trim() : "",
      mileage: mileage.trim() !== "" ? toNumber(mileage) : null,
      items: validItems.map(({ description, amount }) => ({
        description: description.trim(),
        amount,
      })),
      payment_type: paymentType,
      transfer_bank: paymentType === "เงินโอน" || paymentType === "แบ่งจ่าย" ? transferBank : "",
      check_number: paymentType === "เช็ค" ? checkNumber : "",
      cash_amount: paymentType === "แบ่งจ่าย" ? splitCashNumber : null,
      notes: serviceDetail || notes || "",
    };

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const session = await getSession();
      const token = (session as any)?.user?.accessToken;
      if (!token) {
        toast.error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/service/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(getErrorMessage(err, `บันทึกไม่สำเร็จ (${res.status})`));
        return;
      }

      toast.success("บันทึกรายการสำเร็จ!");
      const bikeId = orderBike.id;
      resetOrder();
      router.push(`/service-history?bike=${bikeId}`);
    } catch (error) {
      console.error("❌ service checkout error:", error);
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ ลองใหม่อีกครั้ง");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return { handleServiceCheckout, isSubmitting, validationMessage };
};