"use client";

import { PaymentType, TransferBank, PaymentTypeSection } from "../shared/PaymentSection";
import { parseSellPrice } from "../shared/Financecalculations";

interface ServiceOrderFooterProps {
  amount: string;

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
 * แสดงยอดรวม + ปุ่ม "บันทึกรายการ" (ไม่มีค่างวด/ไฟแนนซ์เหมือนฟอร์มขาย)
 */
const ServiceOrderFooter = ({
  amount,
  paymentType,
  setPaymentType,
  transferBank,
  setTransferBank,
  checkNumber,
  setCheckNumber,
  onSubmit,
}: ServiceOrderFooterProps) => {
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
          <span>฿ {parseSellPrice(amount).toLocaleString()}</span>
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