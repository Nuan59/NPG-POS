"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Package, Plus, X } from "lucide-react";
import PartPickerDialog, { PickedPart } from "./PartPickerDialog";
import { CostCodeBadge } from "../shared/CostCode";

export interface ServiceItem {
  id: string;
  description: string;
  amount: number;
  // ✅ อะไหล่จากสต็อก (ตัดสต็อกตอนบันทึก)
  partId?: number;
  qty?: number;
  unitPrice?: number;
  unit?: string;
  maxQty?: number;
  costCode?: string;
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
  const [picking, setPicking] = useState(false);

  // ✅ เลือกอะไหล่ซ้ำ = เพิ่มจำนวนในบรรทัดเดิม
  const addPart = (p: PickedPart) => {
    const unitPrice = Number(p.price) || 0;
    const existing = items.find((i) => i.partId === p.id);
    if (existing) {
      const qty = Math.min((existing.qty || 1) + 1, Number(p.qty) || 1);
      setItems(items.map((i) => (i.id === existing.id ? { ...i, qty, amount: qty * (i.unitPrice || 0) } : i)));
      return;
    }
    setItems([
      ...items.filter((i) => i.description.trim() !== "" || i.amount > 0),
      {
        id: newId(), description: p.code ? `${p.name} (${p.code})` : p.name, amount: unitPrice,
        partId: p.id, qty: 1, unitPrice, unit: p.unit, maxQty: Number(p.qty) || 0, costCode: p.cost_code || "",
      },
    ]);
  };

  const setQty = (id: string, raw: string) => {
    setItems(
      items.map((i) => {
        if (i.id !== id) return i;
        let qty = Number(raw.replace(/[^\d.]/g, "")) || 0;
        if (i.maxQty && qty > i.maxQty) qty = i.maxQty;
        return { ...i, qty, amount: qty * (i.unitPrice || 0) };
      })
    );
  };

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

        {items.map((item) => item.partId ? (
          <div key={item.id} className="py-2 border-t border-slate-100 first:border-t-0">
            <div className="flex items-center gap-1.5">
              <Package className="h-4 w-4 shrink-0 text-orange-500" />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold">{item.description}</span>
              <CostCodeBadge value={item.costCode} />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="text-slate-500 hover:text-red-600 grid place-items-center h-7 w-7"
                title="ลบรายการ"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1 grid grid-cols-[auto_64px_auto_1fr] items-center gap-1.5 pl-5 text-xs text-slate-500">
              <span>จำนวน</span>
              <Input
                type="text"
                inputMode="decimal"
                value={item.qty ? String(item.qty) : ""}
                onChange={(e) => setQty(item.id, e.target.value)}
                className="h-8 text-center text-sm"
              />
              <span>{item.unit} × ฿{(item.unitPrice || 0).toLocaleString()}</span>
              <Input
                type="text"
                inputMode="decimal"
                value={item.amount === 0 ? "" : String(item.amount)}
                onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                title="ยอดรวมบรรทัดนี้ (แก้ได้ เช่น ลดราคา)"
                className="h-8 text-right text-sm"
              />
            </div>
          </div>
        ) : (
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
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="w-full mt-2 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl border-[1.5px] border-dashed border-orange-300 bg-orange-50/50 text-orange-700 hover:border-orange-500 transition-colors"
      >
        <Package className="h-4 w-4" />
        อะไหล่จากสต็อก
      </button>
      {picking && <PartPickerDialog onPick={addPart} onClose={() => setPicking(false)} />}
    </div>
  );
};

export const calculateServiceItemsTotal = (items: ServiceItem[]): number =>
  items.reduce((sum, item) => sum + (item.amount || 0), 0);

export default ServiceItems;