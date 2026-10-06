"use client";
// ActionButtons.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/service-history/[service-history_id]/components/ActionButtons.tsx
import { Button } from "@/components/ui/button";
import { IOrder } from "@/types/Order";
import { Trash2, Pencil, Receipt } from "lucide-react";
import Link from "next/link";
import React from "react";
// ✅ ใช้ DeleteOrderDialog ตัวเดียวกับหน้า sales (ไม่สร้างซ้ำ)
import DeleteOrderDialog from "@/app/(private)/sales/[sale_id]/components/DeleteOrderDialog";

interface ActionButtonsProps {
  order: IOrder;
}

const ActionButtons = ({ order }: ActionButtonsProps) => {
  return (
    <div className="w-full flex justify-between">
      <DeleteOrderDialog order={order}>
        <Button className="flex items-center gap-2" variant={"destructive"}>
          <Trash2 size={"1rem"} opacity={"60%"} />
          ลบ
        </Button>
      </DeleteOrderDialog>

      <div className="flex gap-1">
        <Link href={`/sales/${order.id}/edit`}>
          <Button variant={"outline"} className="flex items-center gap-2">
            <Pencil size={"1rem"} opacity={"60%"} />
            แก้ไข
          </Button>
        </Link>
        <Link href={`/service-history/${order.id}/TempReceipt`}>
          <Button className="flex items-center gap-2">
            <Receipt size={"1rem"} opacity={"60%"} />
            ใบเสร็จชั่วคราว
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ActionButtons;