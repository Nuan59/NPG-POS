import { OrderContext } from "@/context/OrderContext";
import { OrderGift as OrderGiftType } from "@/types/Gift";
import { Gift, Pencil, X } from "lucide-react";
import React, { useContext } from "react";
import OrderGiftDialog from "./OrderGiftDialog";

interface OrderGiftProps {
  gift: OrderGiftType;
}

/** ของแถม 1 รายการ - ปุ่มแก้/ลบเห็นตลอด (เดิมต้อง hover กดบนแท็บเล็ตไม่ได้) */
const OrderGift = ({ gift }: OrderGiftProps) => {
  const { removeOrderGift } = useContext(OrderContext);

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-sm">
      <span className="w-6 h-6 shrink-0 rounded-lg bg-pink-50 text-pink-600 grid place-items-center">
        <Gift size={13} />
      </span>
      <span className="truncate">{gift.name}</span>
      <span className="ml-auto font-medium whitespace-nowrap">× {gift.amount}</span>

      <OrderGiftDialog gift={gift}>
        <button type="button" className="p-1 text-slate-400 hover:text-orange-500" title="แก้ไข">
          <Pencil size={14} />
        </button>
      </OrderGiftDialog>
      <button
        type="button"
        onClick={() => removeOrderGift(gift.id)}
        className="p-1 text-slate-400 hover:text-red-600"
        title="ลบ"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export default OrderGift;