"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addGiftsToStock } from "@/services/GiftService";
import { Gift } from "@/types/Gift";
import React, { useState } from "react";
import { toast } from "sonner";

interface AddProductsProps {
  gift: Gift;
}

const AddProducts = ({ gift }: AddProductsProps) => {
  const [amount, setAmount] = useState<number | undefined>(undefined);

  async function addProducts() {
    if (!amount) {
      toast.warning("Define the amount to add to stock!");
      return;
    }

    const result = await addGiftsToStock(gift.id, amount);

    const { message } = result.data;

    if (result.status === "success") {
      setAmount(0);
      toast.success(message);
      return;
    }

    toast.error(message);
  }

  return (
    <div className="col-span-1 flex gap-1">
      <Input
        type="number"
        value={amount}
        onChange={(e) =>
          setAmount(e.target.value ? Number(e.target.value) : undefined)
        }
        placeholder={`Add ${gift.name}s to stock`}
      ></Input>
      <Button onClick={addProducts}>Add products</Button>
    </div>
  );
};

export default AddProducts;
