"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IOrder } from "@/types/Order";
import { createOrder } from "@/services/OrderService";
import { parseSellPrice } from "../shared/Financecalculations";
import { PaymentType, TransferBank } from "../shared/PaymentSection";
import { TransactionType } from "../types";

interface UseServiceOrderCheckoutParams {
  orderCustomer: any;
  orderBike: any;
  orderAdditionalFees: any[];
  orderGifts: any[];
  notes: string;
  resetOrder: () => void;

  transactionType: TransactionType;
  otherTransactionDetail: string;
  serviceAmount: string;
  serviceDetail: string;

  paymentType: PaymentType;
  transferBank: TransferBank;
  checkNumber: string;
}

/**
 * Logic การสร้างออเดอร์ประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
 * (ฟอร์มแบบง่าย ไม่มีไฟแนนซ์ รถเป็นตัวเลือก ไม่บังคับ)
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
  serviceAmount,
  serviceDetail,
  paymentType,
  transferBank,
  checkNumber,
}: UseServiceOrderCheckoutParams) => {
  const router = useRouter();

  const handleServiceCheckout = async () => {
    if (!orderCustomer) {
      toast.info("Select customer before checkout");
      return;
    }

    const amount = parseSellPrice(serviceAmount);
    if (amount <= 0) {
      toast.info("กรุณากรอกราคา/ค่าใช้จ่ายก่อนชำระเงิน");
      return;
    }

    if (transactionType === "อื่นๆ" && !otherTransactionDetail.trim()) {
      toast.info("กรุณาระบุรายละเอียดประเภทงาน");
      return;
    }

    const payload = {
      customer: orderCustomer.id,
      // ✅ รถเป็นตัวเลือก ไม่บังคับ สำหรับประเภทนี้
      bikes: orderBike ? [orderBike] : [],
      additional_fees: orderAdditionalFees.map((fee) => fee),
      gifts: orderGifts.map((gift) => gift),

      sale_price: amount,
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

      notes: serviceDetail || notes,
      total: amount,
    } as IOrder;

    const checkout = await createOrder(payload);
    if (checkout.status === "success") {
      const data = await checkout.data;
      const orderId = data.data;

      toast.success("บันทึกรายการสำเร็จ!");

      resetOrder();
      router.push(`/sales/${orderId}/documents`);
    } else {
      const error = await checkout.data;
      Object.keys(error).map((key) => {
        toast.error(`${key}: ${error[key][0]}`);
      });
    }
  };

  return { handleServiceCheckout };
};