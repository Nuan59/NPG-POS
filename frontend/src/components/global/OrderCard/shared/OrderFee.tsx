import { OrderContext } from "@/context/OrderContext";
import { IAdditionalFee } from "@/types/AdditionalFee";
import { X, Pencil } from "lucide-react";
import React, { useContext } from "react";
import AdditionalFeeDialog from "./AdditionalFeeDialog";

interface OrderFeeProps {
  fee: IAdditionalFee;
}

/** ค่าใช้จ่ายเพิ่มเติม 1 รายการ - ปุ่มแก้/ลบเห็นตลอด (เดิมต้อง hover กดบนแท็บเล็ตไม่ได้) */
const OrderFee = ({ fee }: OrderFeeProps) => {
  const { removeAdditionalFee } = useContext(OrderContext);

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-sm">
      <span className="w-6 h-6 shrink-0 rounded-lg bg-orange-50 text-orange-500 grid place-items-center text-xs font-semibold">
        ฿
      </span>
      <span className="truncate">{fee.description}</span>
      <span className="ml-auto font-medium whitespace-nowrap">{Number(fee.amount || 0).toLocaleString()}</span>

      <AdditionalFeeDialog fee={fee}>
        <button type="button" className="p-1 text-slate-400 hover:text-orange-500" title="แก้ไข">
          <Pencil size={14} />
        </button>
      </AdditionalFeeDialog>
      <button
        type="button"
        onClick={() => removeAdditionalFee(fee.id)}
        className="p-1 text-slate-400 hover:text-red-600"
        title="ลบ"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export default OrderFee;