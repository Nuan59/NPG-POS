import { OrderContext } from "@/context/OrderContext";
import { OrderGift as OrderGiftType } from "@/types/Gift";
import { Pencil, X } from "lucide-react";
import React, { useContext } from "react";
import OrderGiftDialog from "./OrderGiftDialog";

interface OrderGiftProps {
  gift: OrderGiftType;
}

const OrderGift = ({ gift }: OrderGiftProps) => {
  const { removeOrderGift } = useContext(OrderContext);

  return (
    <div className="group bg-slate-700 text-slate-50 m-1 p-2 rounded-lg text-sm font-extrabold">
      <div className="flex justify-between">
        <span>{gift.name}</span>
        <span>{gift.amount}</span>
      </div>

      <div className="flex gap-1 justify-end items-end">
        <div
          onClick={() => removeOrderGift(gift.id)}
          className="bg-slate-50 p-1 mt-3 w-fit hidden rounded group-hover:flex hover:cursor-pointer hover:scale-110 hover:rounded-sm"
        >
          <X className="text-slate-800" size={14} />
        </div>

        <OrderGiftDialog gift={gift}>
          <div className="bg-slate-50 p-1 mt-3 w-fit hidden rounded group-hover:flex hover:cursor-pointer hover:scale-110 hover:rounded-sm">
            <Pencil className="text-slate-800" size={14} />
          </div>
        </OrderGiftDialog>
      </div>
    </div>
  );
};

export default OrderGift;
