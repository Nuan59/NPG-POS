"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

/**
 * รายการแบบเพิ่ม/ลบได้หลายบรรทัด (คำอธิบาย + ราคา) ต่อ 1 ออเดอร์
 * ใช้กับประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ" ที่อาจมีหลายรายการย่อยในบิลเดียว
 * เช่น ซ่อม: เปลี่ยนยาง, เปลี่ยนน้ำมันเครื่อง, ค่าแรง ฯลฯ
 */
const ServiceItems = ({ items, setItems }: ServiceItemsProps) => {
  const addItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), description: "", amount: 0 },
    ]);
  };

  const updateItem = (
    id: string,
    field: "description" | "amount",
    value: string
  ) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "amount" ? Number(value) || 0 : value,
            }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const total = calculateServiceItemsTotal(items);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2">
        <label className="text-sm font-medium">รายการ</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          เพิ่มรายการ
        </Button>
      </div>

      {items.length === 0 && (
        <div className="text-sm text-slate-500 text-center py-3 border border-dashed rounded-lg mx-2">
          ยังไม่มีรายการ กด &quot;เพิ่มรายการ&quot; เพื่อเริ่มต้น
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 px-2">
          <Input
            type="text"
            value={item.description}
            onChange={(e) => updateItem(item.id, "description", e.target.value)}
            placeholder="รายละเอียดรายการ เช่น เปลี่ยนยาง"
            className="flex-1 text-sm"
          />
          <Input
            type="text"
            inputMode="decimal"
            value={item.amount === 0 ? "" : String(item.amount)}
            onChange={(e) => updateItem(item.id, "amount", e.target.value)}
            placeholder="0"
            className="w-28 text-right text-sm"
          />
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="text-slate-400 hover:text-red-600 p-1 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {items.length > 0 && (
        <div className="flex justify-between items-center px-2 pt-2 mt-1 border-t border-slate-200">
          <span className="text-sm font-medium">รวม</span>
          <span className="text-sm font-semibold">฿ {total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export const calculateServiceItemsTotal = (items: ServiceItem[]): number =>
  items.reduce((sum, item) => sum + (item.amount || 0), 0);

export default ServiceItems;