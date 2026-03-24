"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ProductBadgeProps {
  type: "sold" | "available" | "order";
}

const badgeMap = {
  sold: {
    label: "ขายแล้ว",
    className: "bg-red-100 text-red-700 border-red-300",
  },
  available: {
    label: "พร้อมขาย",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  order: {
    label: "อยู่ในออเดอร์",
    className: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
};

const ProductBadge = ({ type }: ProductBadgeProps) => {
  const badge = badgeMap[type];

  return (
    <span
      className={cn(
        "px-3 py-1 text-sm font-medium border rounded-full",
        badge.className
      )}
    >
      {badge.label}
    </span>
  );
};

export default ProductBadge;
