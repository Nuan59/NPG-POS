"use client";

import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
  // ✅ เลขไมล์ - โชว์เฉพาะตอนมีรถผูกอยู่กับ order นี้ (ไม่มีรถก็ไม่มีอะไรให้จดไมล์)
  showMileage?: boolean;
  mileage: string;
  setMileage: (value: string) => void;
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
  showMileage = false,
  mileage,
  setMileage,
}: ServiceOrderFormProps) => {
  return (
    <>
      <Separator className="my-4" />
      <div className="space-y-3">
        {/* ✅ เลขไมล์ - ใช้ทำประวัติการรับบริการของรถ + ช่วยสังเกตความผิดปกติ (กันทุจริต) */}
        {showMileage && (
          <div className="p-2">
            <label className={labelCls}>เลขไมล์ (กม.)</label>
            <Input
              type="text"
              inputMode="numeric"
              value={mileage}
              onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="เช่น 12500"
              className="mt-1 w-40 text-right p-2 text-sm"
            />
          </div>
        )}

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