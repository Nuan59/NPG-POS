"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeGiftPrice } from "@/services/GiftService";
import { Gift } from "@/types/Gift";
import React, { useState } from "react";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

interface ChangePriceProps {
  gift: Gift;
}

const ChangePrice = ({ gift }: ChangePriceProps) => {
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  async function changePrice() {
    if (price === undefined || price < 0) {
      toast.warning("กรุณากรอกราคาใหม่");
      return;
    }
    setLoading(true);
    const result = await changeGiftPrice(gift.id, price);
    const { message } = result.data;
    if (result.status === "success") {
      setPrice(undefined);
      toast.success(message || `เปลี่ยนราคา ${gift.name} สำเร็จ`);
    } else {
      toast.error(message || "เปลี่ยนราคาไม่สำเร็จ");
    }
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min={0}
        value={price ?? ""}
        onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : undefined)}
        placeholder={`ราคาใหม่ (ปัจจุบัน ฿${Number(gift.price || 0).toLocaleString()})`}
        className="flex-1"
      />
      <Button onClick={changePrice} disabled={loading} variant="outline" className="gap-1 whitespace-nowrap">
        <DollarSign size={16} />
        {loading ? "กำลังบันทึก..." : "เปลี่ยนราคา"}
      </Button>
    </div>
  );
};

export default ChangePrice;