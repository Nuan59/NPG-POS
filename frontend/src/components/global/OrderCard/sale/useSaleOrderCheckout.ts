"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IOrder } from "@/types/Order";
import { createOrder } from "@/services/OrderService";
import { parseSellPrice, toNumber, getErrorMessage } from "../shared/Financecalculations";
import type { FinanceProvider, NpgPeriod } from "../shared/Financecalculations";
import { PaymentType, TransferBank } from "../shared/PaymentSection";

interface UseSaleOrderCheckoutParams {
  orderCustomer: any;
  orderBike: any;
  orderAdditionalFees: any[];
  orderGifts: any[];
  notes: string;
  resetOrder: () => void;

  sellPrice: string;
  deposit: number;
  discount: number;
  down_payment: number;
  depositReceiptNo: string;

  paymentMethod: string;
  financeProvider: FinanceProvider;
  npgPeriod: NpgPeriod;
  financeAmount: string;
  interest: string;
  installmentCount: string;
  installmentPerPeriod: string;

  paymentType: PaymentType;
  transferBank: TransferBank;
  checkNumber: string;
  splitCash: string;

  totalPayment: number;
  cashTotal: number;

  // ✅ ผ่อนดาวน์ (เฉพาะไฟแนนซ์) - ส่งไปให้ backend สร้างบัญชี NPG แยกสำหรับส่วนที่เหลือ
  downPaymentInstallment: boolean;
  downPaymentFirstPaymentAmount: number;
  downPaymentInstallmentCount: string;
  downPaymentInterestRate: string;
  downPaymentRemainingBalance: number;
  downPaymentPerRemainingInstallment: number;
  downPaymentNextPaymentDate: string;
}

/**
 * Logic การสร้างออเดอร์ประเภท "ขาย"
 * ✅ payload ที่ส่งไป backend เหมือนเดิมทุก field - เพิ่มแค่การตรวจก่อนส่ง + กันกดซ้ำ + จัดการ error
 */
export const useSaleOrderCheckout = ({
  orderCustomer,
  orderBike,
  orderAdditionalFees,
  orderGifts,
  notes,
  resetOrder,
  sellPrice,
  deposit,
  discount,
  down_payment,
  depositReceiptNo,
  paymentMethod,
  financeProvider,
  npgPeriod,
  financeAmount,
  interest,
  installmentCount,
  installmentPerPeriod,
  paymentType,
  transferBank,
  checkNumber,
  splitCash,
  totalPayment,
  cashTotal,
  downPaymentInstallment,
  downPaymentFirstPaymentAmount,
  downPaymentInstallmentCount,
  downPaymentInterestRate,
  downPaymentRemainingBalance,
  downPaymentPerRemainingInstallment,
  downPaymentNextPaymentDate,
}: UseSaleOrderCheckoutParams) => {
  const router = useRouter();
  // ✅ กันกดซ้ำ - ref เช็คทันที (state อัปเดตไม่ทันถ้ากดเบิ้ลเร็วๆ) + state ไว้ล็อกปุ่ม
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** ตรวจข้อมูลก่อนส่ง - คืนข้อความผิดพลาด หรือ "" ถ้าผ่าน */
  const validate = (): string => {
    if (!orderCustomer) return "กรุณาเลือกลูกค้าก่อนชำระเงิน";
    if (!orderBike) return "กรุณาเลือกรถก่อนชำระเงิน";

    const sell = parseSellPrice(sellPrice);
    if (sell <= 0) return "กรุณากรอกราคาขายก่อนชำระเงิน";

    if (paymentMethod !== "เงินสด" && paymentMethod !== "ไฟแนนซ์") {
      return "กรุณาเลือกประเภทการซื้อ (เงินสด/ไฟแนนซ์)";
    }

    if (paymentMethod === "ไฟแนนซ์") {
      if (!financeProvider) return "กรุณาเลือกบริษัทไฟแนนซ์";
      if (financeProvider === "NPG" && !npgPeriod) return "กรุณาเลือกประเภทดอกเบี้ย (รายเดือน/รายปี)";
      if (toNumber(financeAmount) <= 0) return "ยอดจัดต้องมากกว่า 0 (ตรวจราคาขาย/ส่วนลด/เงินดาวน์)";
      if (interest.trim() === "") return "กรุณากรอกดอกเบี้ย (ไม่มีดอกเบี้ยให้ใส่ 0)";
      if (toNumber(installmentCount) <= 0) return "กรุณากรอกจำนวนงวด";

      if (downPaymentInstallment) {
        const first = downPaymentFirstPaymentAmount || 0;
        if (first <= 0) return "ผ่อนดาวน์: กรอกยอดงวดแรกที่รับวันนี้";
        if (first > (down_payment || 0)) return "ผ่อนดาวน์: งวดแรกต้องไม่เกินเงินดาวน์";
        if (downPaymentRemainingBalance > 0) {
          if (toNumber(downPaymentInstallmentCount) <= 0) return "ผ่อนดาวน์: กรอกจำนวนงวดที่เหลือ";
          if (!downPaymentNextPaymentDate) return "ผ่อนดาวน์: เลือกวันครบกำหนดงวดถัดไป";
        }
      }
    }

    const payTotal = paymentMethod === "ไฟแนนซ์" ? totalPayment : cashTotal;
    if (payTotal < 0) return "ยอดชำระติดลบ - ตรวจมัดจำ/ส่วนลดอีกครั้ง";

    // ✅ ต้องเลือกรูปแบบการชำระทุกครั้งที่มียอดต้องจ่าย (ระบบส่งเงินสดใช้ค่านี้ตัดสินว่าต้องส่งเงินไหม)
    if (payTotal > 0) {
      if (!paymentType) return "กรุณาเลือกรูปแบบการชำระ";
      if ((paymentType === "เงินโอน" || paymentType === "แบ่งจ่าย") && !transferBank) {
        return "กรุณาเลือกธนาคารที่โอนเข้า";
      }
      if (paymentType === "เช็ค" && !checkNumber.trim()) return "กรุณากรอกเลขที่เช็ค";
      // แบ่งจ่าย - เงินสดต้องมากกว่า 0 และน้อยกว่ายอดชำระรวม (ที่เหลือคือโอน)
      const splitCashNumber = toNumber(splitCash);
      if (paymentType === "แบ่งจ่าย" && (splitCashNumber <= 0 || splitCashNumber >= payTotal)) {
        return `แบ่งจ่าย: กรอกยอดเงินสดให้มากกว่า 0 และน้อยกว่า ฿${payTotal.toLocaleString()}`;
      }
    }
    return "";
  };

  // ✅ โชว์ใต้ปุ่มได้ทันทีว่ายังขาดอะไร (คำนวณใหม่ทุก render - ไม่มี side effect)
  const validationMessage = validate();

  const handleOrderCheckout = async () => {
    if (submittingRef.current) return;

    const error = validate();
    if (error) {
      toast.info(error);
      return;
    }

    const sell = parseSellPrice(sellPrice);
    const splitCashNumber = toNumber(splitCash);

    const payload = {
      customer: orderCustomer.id,
      bikes: [orderBike],
      additional_fees: orderAdditionalFees.map((fee) => fee),
      gifts: orderGifts.map((gift) => gift),

      // ข้อมูลการขาย
      sale_price: sell,
      deposit: deposit || 0,
      discount,
      down_payment,

      // ข้อมูลไฟแนนซ์
      finance_amount: paymentMethod === "ไฟแนนซ์" ? toNumber(financeAmount) : 0,
      interest_rate: paymentMethod === "ไฟแนนซ์" ? toNumber(interest) : 0,
      installment_count: paymentMethod === "ไฟแนนซ์" ? toNumber(installmentCount) : 0,
      installment_amount: paymentMethod === "ไฟแนนซ์" ? toNumber(installmentPerPeriod) : 0,
      finance_provider:
        paymentMethod === "ไฟแนนซ์" && financeProvider ? financeProvider : "",

      // ✅ รายเดือน/รายปี - มีความหมายเฉพาะไฟแนนซ์ NPG เท่านั้น (ไฟแนนซ์เจ้าอื่นจ่ายรายเดือนเสมอ
      // ตัวเลข "ดอกเบี้ย" ถูกตีความเป็นรายปี/รายเดือนจากขนาดรถแทน ไม่ได้เก็บเป็น field นี้)
      npg_period:
        paymentMethod === "ไฟแนนซ์" && financeProvider === "NPG" ? npgPeriod : "",

      // ประเภทการซื้อ
      payment_method:
        paymentMethod === "ไฟแนนซ์" && financeProvider
          ? financeProvider
          : paymentMethod,

      // รูปแบบการชำระ
      payment_type: paymentType,
      transfer_bank: paymentType === "เงินโอน" || paymentType === "แบ่งจ่าย" ? transferBank : "",
      check_number: paymentType === "เช็ค" ? checkNumber : "",
      cash_amount: paymentType === "แบ่งจ่าย" ? splitCashNumber : null,

      notes: depositReceiptNo
        ? `DEPOSIT_RECEIPT:${depositReceiptNo}${notes ? `\n${notes}` : ""}`
        : notes,
      total: paymentMethod === "ไฟแนนซ์" ? totalPayment : cashTotal,

      // ✅ ผ่อนดาวน์ - ส่งข้อมูลไปให้ backend สร้างบัญชี NPG แยกสำหรับงวดที่ 2 เป็นต้นไป
      // (ยอด "total" ด้านบนถูกปรับให้เป็นแค่งวดแรกที่กรอกเองแล้วตั้งแต่ index.tsx)
      down_payment_installment:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment,
      down_payment_first_installment:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? downPaymentFirstPaymentAmount : 0,
      down_payment_remaining_balance:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? downPaymentRemainingBalance : 0,
      down_payment_installment_count:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? toNumber(downPaymentInstallmentCount) : 0,
      down_payment_interest_rate:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? toNumber(downPaymentInterestRate) : 0,
      down_payment_per_remaining_installment:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? downPaymentPerRemainingInstallment : 0,
      // ✅ วันครบกำหนดงวดถัดไป (แก้เองได้แล้ว ไม่ใช่ +30 วันตายตัวเสมอไป)
      down_payment_next_payment_date:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? downPaymentNextPaymentDate : "",
    } as IOrder;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const checkout = await createOrder(payload);
      if (checkout?.status === "success") {
        const data = await checkout.data;
        const orderId = data?.data;

        toast.success("ชำระเงินสำเร็จ!");
        resetOrder();
        if (orderId) {
          router.push(`/sales/${orderId}/documents`);
        } else {
          router.push("/sales");
        }
      } else {
        const error = await checkout?.data;
        toast.error(getErrorMessage(error, "สั่งซื้อไม่สำเร็จ"));
      }
    } catch (err) {
      console.error("❌ sale checkout error:", err);
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ ลองใหม่อีกครั้ง");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return { handleOrderCheckout, isSubmitting, validationMessage };
};