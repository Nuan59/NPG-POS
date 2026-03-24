"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeGiftPrice } from "@/services/GiftService";
import { Gift } from "@/types/Gift";
import React, { useState } from "react";
import { toast } from "sonner";

interface ChangePriceProps {
  gift: Gift;
}

const ChangePrice = ({ gift }: ChangePriceProps) => {
  const [price, setPrice] = useState<number | undefined>(undefined);

  async function changePrice() {
    if (!price) {
      toast.warning("Define the new price to change");
      return;
    }

    const result = await changeGiftPrice(gift.id, price);

    const { message } = result.data;

    if (result.status === "success") {
      setPrice(0);
      toast.success(message);
      return;
    }

    toast.error(message);
  }

  return (
    <div className="col-span-1 flex gap-1">
      <Input
        type="number"
        value={price}
        onChange={(e) =>
          setPrice(e.target.value ? Number(e.target.value) : undefined)
        }
        placeholder={`Change ${gift.name} price`}
      ></Input>
      <Button onClick={changePrice}>Change price</Button>
    </div>
  );
};

export default ChangePrice;
