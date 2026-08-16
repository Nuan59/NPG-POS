"use client";

import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { TransactionType } from "../types";
import ServiceItems, { ServiceItem } from "./ServiceItems";

const labelCls = "text-sm font-medium min-w-[100px]";

interface ServiceOrderFormProps {
  transactionType: TransactionType;
  items: ServiceItem[];
  setItems: (items: ServiceItem[]) => void;
  detail: string;
  setDetail: (value: string) => void;
}

/**
 * ฟอร์มสำหรับประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
 * ไม่มีไฟแนนซ์ - เพิ่มรายการย่อยได้หลายรายการ (คำอธิบาย + ราคา) พร้อมยอดรวมอัตโนมัติ
 */
const ServiceOrderForm = ({
  transactionType,
  items,
  setItems,
  detail,
  setDetail,
}: ServiceOrderFormProps) => {
  return (
    <>
      <Separator className="my-4" />
      <div className="space-y-3">
        <ServiceItems items={items} setItems={setItems} />

        <div className="p-2">
          <label className={labelCls}>หมายเหตุเพิ่มเติม</label>
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={`หมายเหตุ${transactionType}...`}
            className="mt-1 text-sm"
          />
        </div>
      </div>
    </>
  );
};

export default ServiceOrderForm;