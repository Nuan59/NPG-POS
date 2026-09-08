// AddCashflowRowDialog.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/AddCashflowRowDialog.tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { RowType, TYPE_COLOR, TYPE_FIELDS, TYPE_LABEL } from "../util/cashflowUtil";

interface AddCashflowRowDialogProps {
  onClose: () => void;
  onAdd: (data: { description: string; type: RowType; amount: number }) => void;
}

// ✅ ตัดตัวอักษรอื่นออกเหลือแต่ตัวเลขกับจุดทศนิยม (จุดเดียว) แล้วใส่ comma คั่นหลักพันให้อ่านง่าย
// ระหว่างพิมพ์ - กันพนักงานกรอกผิด/พิมพ์ตัวอักษรปนตัวเลขจนคำนวณเพี้ยน
const formatAmountInput = (raw: string): string => {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
  const [intPart, decPart] = cleaned.split(".");
  const formattedInt = intPart ? Number(intPart).toLocaleString("en-US") : "";
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
};

const parseAmount = (formatted: string): number => Number(formatted.replace(/,/g, "")) || 0;

const AddCashflowRowDialog = ({ onClose, onAdd }: AddCashflowRowDialogProps) => {
  const [description, setDescription] = useState("");
  const [type, setType] = useState<RowType>("income");
  const [amountInput, setAmountInput] = useState("");

  const amount = parseAmount(amountInput);
  const isValid = description.trim() !== "" && amount > 0;

  const handleAdd = () => {
    if (!isValid) return;
    onAdd({ description: description.trim(), type, amount });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">เพิ่มรายการ</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          {/* รายการนั้นชื่ออะไร */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">รายการนี้คืออะไร</label>
            <input
              autoFocus
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isValid && handleAdd()}
              placeholder="เช่น ค่าน้ำมัน, ขายอะไหล่, ทอนเงินลูกค้า..."
              className="w-full text-sm border rounded-lg px-3 py-2 border-gray-300 outline-none focus:border-orange-400"
            />
          </div>

          {/* ทำอะไร (ประเภท) */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">ประเภทรายการ</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TYPE_FIELDS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`text-xs font-semibold rounded-md border px-2 py-2 transition-all ${
                    type === t ? `${TYPE_COLOR[t]} ring-2 ring-offset-1 ring-orange-400` : "border-gray-200 text-gray-400 bg-white"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* กี่บาท */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">จำนวนเงิน</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(formatAmountInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && isValid && handleAdd()}
                placeholder="0"
                className="w-full text-right text-lg font-semibold border rounded-lg pl-3 pr-12 py-2 border-gray-300 outline-none focus:border-orange-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">บาท</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleAdd}
            disabled={!isValid}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white text-sm font-medium py-2 rounded-lg"
          >
            เพิ่มรายการ
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCashflowRowDialog;