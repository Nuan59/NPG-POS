"use client";

import { SummaryFooterShell } from "../shared/PaymentSection";
import { ServiceItem, calculateServiceItemsTotal } from "./ServiceItems";

interface ServiceOrderFooterProps {
  items: ServiceItem[];
  onSubmit: () => void;
  // ✅ กำลังบันทึก - ล็อกปุ่มกันกดซ้ำ
  isSubmitting?: boolean;
  // ✅ ข้อความบอกว่ายังขาดอะไร
  hint?: string;
}

/**
 * ท้ายการ์ดสำหรับ "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
 * แสดงรายการ + ยอดรวม + ปุ่ม "บันทึกรายการ"
 * (รูปแบบการชำระย้ายไปอยู่ในส่วนเนื้อหาของการ์ดใน index.tsx แล้ว)
 */
const ServiceOrderFooter = ({ items, onSubmit, isSubmitting = false, hint }: ServiceOrderFooterProps) => {
  const total = calculateServiceItemsTotal(items);
  const lines = items
    .filter((i) => i.description.trim() !== "" && i.amount > 0)
    .map((i) => ({ label: i.description.trim(), amount: i.amount }));

  return (
    <SummaryFooterShell
      lines={lines}
      totalLabel="ยอดรวม"
      total={total}
      buttonLabel="บันทึกรายการ"
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      hint={hint}
    />
  );
};

export default ServiceOrderFooter;