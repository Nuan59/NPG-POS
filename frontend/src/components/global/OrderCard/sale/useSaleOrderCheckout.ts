"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IOrder } from "@/types/Order";
import { createOrder } from "@/services/OrderService";
import { parseSellPrice, toNumber } from "../shared/Financecalculations";
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

  totalPayment: number;
  cashTotal: number;

  // ✅ ผ่อนดาวน์ (เฉพาะไฟแนนซ์) - ส่งไปให้ backend สร้างบัญชี NPG แยกสำหรับส่วนที่เหลือ
  downPaymentInstallment: boolean;
  downPaymentInstallmentCount: string;
  downPaymentInterestRate: string;
  downPaymentFirstInstallment: number;
}

/**
 * Logic การสร้างออเดอร์ประเภท "ขาย"
 * (ย้ายออกมาจาก index.tsx เดิม - logic ไม่เปลี่ยนแปลงแม้แต่บรรทัดเดียว)
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
  totalPayment,
  cashTotal,
  downPaymentInstallment,
  downPaymentInstallmentCount,
  downPaymentInterestRate,
  downPaymentFirstInstallment,
}: UseSaleOrderCheckoutParams) => {
  const router = useRouter();

  const handleOrderCheckout = async () => {
    if (!orderCustomer) {
      toast.info("Select customer before checkout");
      return;
    }

    const sell = parseSellPrice(sellPrice);
    if (sell <= 0) {
      toast.info("กรุณากรอกราคาขายก่อนชำระเงิน");
      return;
    }

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
      transfer_bank: paymentType === "เงินโอน" ? transferBank : "",
      check_number: paymentType === "เช็ค" ? checkNumber : "",

      notes: depositReceiptNo
        ? `DEPOSIT_RECEIPT:${depositReceiptNo}${notes ? `\n${notes}` : ""}`
        : notes,
      total: paymentMethod === "ไฟแนนซ์" ? totalPayment : cashTotal,

      // ✅ ผ่อนดาวน์ - ส่งข้อมูลไปให้ backend สร้างบัญชี NPG แยกสำหรับงวดที่ 2 เป็นต้นไป
      // (ยอด "total" ด้านบนถูกปรับให้เป็นแค่ค่างวดแรกแล้วตั้งแต่ index.tsx)
      down_payment_installment:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment,
      down_payment_installment_amount:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? down_payment : 0,
      down_payment_installment_count:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? toNumber(downPaymentInstallmentCount) : 0,
      down_payment_interest_rate:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? toNumber(downPaymentInterestRate) : 0,
      down_payment_first_installment:
        paymentMethod === "ไฟแนนซ์" && downPaymentInstallment ? downPaymentFirstInstallment : 0,
    } as IOrder;

    const checkout = await createOrder(payload);
    if (checkout.status === "success") {
      const data = await checkout.data;
      const orderId = data.data;

      toast.success("ชำระเงินสำเร็จ!");

      resetOrder();
      router.push(`/sales/${orderId}/documents`);
    } else {
      const error = await checkout.data;
      Object.keys(error).map((key) => {
        toast.error(`${key}: ${error[key][0]}`);
      });
    }
  };

  return { handleOrderCheckout };
};