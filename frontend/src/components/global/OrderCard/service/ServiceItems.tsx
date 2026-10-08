"use client";

import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

export interface ServiceItem {
  id: string;
  description: string;
  amount: number;
}

interface ServiceItemsProps {
  items: ServiceItem[];
  setItems: (items: ServiceItem[]) => void;
}

// ✅ crypto.randomUUID ใช้ไม่ได้บนเบราว์เซอร์เก่า/หน้าเว็บที่ไม่ใช่ https - มีตัวสำรอง
const newId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * รายการแบบเพิ่ม/ลบได้หลายบรรทัด (คำอธิบาย + ราคา) ต่อ 1 ออเดอร์
 * ใช้กับประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ" (ยอดรวมโชว์ที่ท้ายการ์ด)
 */
const ServiceItems = ({ items, setItems }: ServiceItemsProps) => {
  const addItem = () => {
    setItems([...items, { id: newId(), description: "", amount: 0 }]);
  };

  const updateItem = (id: string, field: "description" | "amount", value: string) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "amount" ? Number(value.replace(/,/g, "")) || 0 : value,
            }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-2xl px-3 py-1">
        {items.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-3">
            ยังไม่มีรายการ กด &quot;เพิ่มรายการ&quot; เพื่อเริ่มต้น
          </div>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_96px_28px] gap-1.5 items-center py-1.5 border-t border-slate-100 first:border-t-0"
          >
            <Input
              type="text"
              value={item.description}
              onChange={(e) => updateItem(item.id, "description", e.target.value)}
              placeholder="รายละเอียด เช่น เปลี่ยนยาง"
              className="h-9 w-full min-w-0 text-sm"
            />
            <Input
              type="text"
              inputMode="decimal"
              value={item.amount === 0 ? "" : String(item.amount)}
              onChange={(e) => updateItem(item.id, "amount", e.target.value)}
              placeholder="0"
              className="h-9 w-full min-w-0 text-right text-sm"
            />
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-slate-500 hover:text-red-600 grid place-items-center h-9"
              title="ลบรายการ"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="w-full mt-2 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl border-[1.5px] border-dashed border-slate-300 bg-white text-[#1e2432] hover:border-orange-500 hover:text-orange-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        เพิ่มรายการ
      </button>
    </div>
  );
};

export const calculateServiceItemsTotal = (items: ServiceItem[]): number =>
  items.reduce((sum, item) => sum + (item.amount || 0), 0);

export default ServiceItems;