"use client";

import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TransactionType } from "../types";

const labelCls = "text-sm font-medium min-w-[100px]";
const inputCls = "w-40 text-right p-2 text-sm";

interface ServiceOrderFormProps {
  transactionType: TransactionType;
  amount: string;
  setAmount: (value: string) => void;
  detail: string;
  setDetail: (value: string) => void;
}

/**
 * ฟอร์มแบบง่ายสำหรับประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
 * ไม่มีไฟแนนซ์ - แค่ราคา/ค่าใช้จ่าย + รายละเอียดงาน
 */
const ServiceOrderForm = ({
  transactionType,
  amount,
  setAmount,
  detail,
  setDetail,
}: ServiceOrderFormProps) => {
  return (
    <>
      <Separator className="my-4" />
      <div className="space-y-3">
        <div className="flex justify-between items-center p-2">
          <label className={labelCls}>ราคา / ค่าใช้จ่าย</label>
          <Input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>

        <div className="p-2">
          <label className={labelCls}>รายละเอียดงาน</label>
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={`รายละเอียด${transactionType}...`}
            className="mt-1 text-sm"
          />
        </div>
      </div>
    </>
  );
};

export default ServiceOrderForm;