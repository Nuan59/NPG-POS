"use client";

import { Input } from "@/components/ui/input";
import { TransactionType, TRANSACTION_TYPES } from "../types";

interface TransactionTypeTabsProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  otherDetail: string;
  onOtherDetailChange: (value: string) => void;
}

// ชื่อบนแท็บ (ย่อให้พอดีช่อง - ค่าที่บันทึกยังเป็นชื่อเต็มเหมือนเดิม)
const TAB_LABEL: Record<TransactionType, string> = {
  ขาย: "ขาย",
  ซ่อม: "ซ่อม",
  "ต่อภาษี+พรบ": "ภาษี+พรบ",
  อื่นๆ: "อื่นๆ",
};

/**
 * แท็บเลือกประเภทธุรกรรม: ขาย / ซ่อม / ต่อภาษี+พรบ / อื่นๆ
 * เลือก "อื่นๆ" จะโผล่ช่องกรอกรายละเอียดเพิ่มเติม
 */
const TransactionTypeTabs = ({ value, onChange, otherDetail, onOtherDetailChange }: TransactionTypeTabsProps) => {
  return (
    <div className="mb-1">
      <div className="grid grid-cols-4 gap-0.5 bg-slate-200/70 rounded-xl p-1">
        {TRANSACTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`text-[13px] py-2 px-1 rounded-lg transition-colors ${
              value === type ? "bg-[#1e2432] text-white font-medium" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {TAB_LABEL[type] ?? type}
          </button>
        ))}
      </div>

      {value === "อื่นๆ" && (
        <Input
          type="text"
          value={otherDetail}
          onChange={(e) => onOtherDetailChange(e.target.value)}
          placeholder="โปรดระบุประเภทงาน"
          className="mt-2 text-sm bg-white"
        />
      )}
    </div>
  );
};

export default TransactionTypeTabs;