"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TransactionType } from "../types";
import ServiceItems, { ServiceItem } from "./ServiceItems";
import { StepLabel } from "../shared/PaymentSection";

interface ServiceOrderFormProps {
  transactionType: TransactionType;
  items: ServiceItem[];
  setItems: (items: ServiceItem[]) => void;
  detail: string;
  setDetail: (value: string) => void;
  // ✅ เลขไมล์ - โชว์เฉพาะตอนมีรถผูกอยู่กับ order นี้
  showMileage?: boolean;
  mileage: string;
  setMileage: (value: string) => void;
}

/**
 * ฟอร์มสำหรับประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
 * ไม่มีไฟแนนซ์ - เพิ่มรายการย่อยได้หลายรายการ (คำอธิบาย + ราคา)
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
      {/* ✅ เลขไมล์ - ใช้ทำประวัติการรับบริการของรถ + ช่วยสังเกตความผิดปกติ (กันทุจริต) */}
      {showMileage && (
        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
          <span>เลขไมล์</span>
          <Input
            type="text"
            inputMode="numeric"
            value={mileage}
            onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="เช่น 12500"
            className="w-32 h-9 text-right text-sm bg-white"
          />
          <span>กม.</span>
        </div>
      )}

      <StepLabel step={3} label="รายการ" />
      <ServiceItems items={items} setItems={setItems} />

      <StepLabel label="หมายเหตุ" />
      <Textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder={`หมายเหตุ${transactionType}...`}
        className="text-sm bg-white rounded-xl"
      />
    </>
  );
};

export default ServiceOrderForm;