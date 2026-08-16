"use client";

import { PaymentType, TransferBank, PaymentTypeSection } from "../shared/PaymentSection";
import { ServiceItem, calculateServiceItemsTotal } from "./ServiceItems";

interface ServiceOrderFooterProps {
  items: ServiceItem[];

  paymentType: PaymentType;
  setPaymentType: (value: PaymentType) => void;
  transferBank: TransferBank;
  setTransferBank: (value: TransferBank) => void;
  checkNumber: string;
  setCheckNumber: (value: string) => void;

  onSubmit: () => void;
}

/**
 * Footer สำหรับประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
 * แสดงยอดรวม (คำนวณจากผลรวมของทุกรายการ) + ปุ่ม "บันทึกรายการ"
 */
const ServiceOrderFooter = ({
  items,
  paymentType,
  setPaymentType,
  transferBank,
  setTransferBank,
  checkNumber,
  setCheckNumber,
  onSubmit,
}: ServiceOrderFooterProps) => {
  const total = calculateServiceItemsTotal(items);

  return (
    <>
      <PaymentTypeSection
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        transferBank={transferBank}
        setTransferBank={setTransferBank}
        checkNumber={checkNumber}
        setCheckNumber={setCheckNumber}
      />

      <div className="sticky">
        <div className="w-full border-slate-700 border-b mt-2"></div>
        <div className="flex justify-between p-2 text-lg">
          <span>ยอดรวม</span>
          <span>฿ {total.toLocaleString()}</span>
        </div>
        <button
          onClick={onSubmit}
          className="bg-slate-900 hover:bg-slate-950 p-2 px-9 rounded-lg text-slate-50 text-lg w-full"
        >
          บันทึกรายการ
        </button>
      </div>
    </>
  );
};

export default ServiceOrderFooter;