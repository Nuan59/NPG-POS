"use client";

import { Input } from "@/components/ui/input";
import { TransactionType, TRANSACTION_TYPES } from "../types";

interface TransactionTypeTabsProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  otherDetail: string;
  onOtherDetailChange: (value: string) => void;
}

/**
 * แท็บเลือกประเภทธุรกรรม: ขาย / ซ่อม / ต่อภาษี+พรบ / อื่นๆ
 * เลือก "อื่นๆ" จะโผล่ช่องกรอกรายละเอียดเพิ่มเติม
 */
const TransactionTypeTabs = ({
  value,
  onChange,
  otherDetail,
  onOtherDetailChange,
}: TransactionTypeTabsProps) => {
  return (
    <div className="mb-4 -mt-1">
      <div className="flex border-b border-slate-300">
        {TRANSACTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`flex-1 text-sm font-semibold py-3 px-2 text-center border-b-2 transition-colors ${
              value === type
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {value === "อื่นๆ" && (
        <Input
          type="text"
          value={otherDetail}
          onChange={(e) => onOtherDetailChange(e.target.value)}
          placeholder="โปรดระบุประเภทงาน"
          className="mt-2 text-sm"
        />
      )}
    </div>
  );
};

export default TransactionTypeTabs;