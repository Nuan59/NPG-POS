"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addGiftsToStock } from "@/services/GiftService";
import { Gift } from "@/types/Gift";
import React, { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface AddProductsProps {
  gift: Gift;
}

const AddProducts = ({ gift }: AddProductsProps) => {
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  async function addProducts() {
    if (!amount || amount <= 0) {
      toast.warning("กรุณากรอกจำนวนที่ต้องการเพิ่ม");
      return;
    }
    setLoading(true);
    const result = await addGiftsToStock(gift.id, amount);
    const { message } = result.data;
    if (result.status === "success") {
      setAmount(undefined);
      toast.success(message || `เพิ่ม stock ${gift.name} +${amount} สำเร็จ`);
    } else {
      toast.error(message || "เพิ่ม stock ไม่สำเร็จ");
    }
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      <Input
        type="number"
        min={1}
        value={amount ?? ""}
        onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : undefined)}
        placeholder="จำนวนที่เพิ่ม"
        className="flex-1"
      />
      <Button onClick={addProducts} disabled={loading} className="gap-1 whitespace-nowrap">
        <Plus size={16} />
        {loading ? "กำลังเพิ่ม..." : "เพิ่ม Stock"}
      </Button>
    </div>
  );
};

export default AddProducts;