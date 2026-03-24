"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Gift } from "@/types/Gift";
import GiftRowButton from "./GiftRowButton";

export const GiftColumns: ColumnDef<Gift>[] = [
  {
    accessorKey: "name",
    header: "ชื่อของแถม",
  },
  {
    accessorKey: "price",
    header: "ราคา",
  },
  {
    accessorKey: "stock",
    header: "จำนวนคงเหลือ",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const gift = row.original;

      return <GiftRowButton gift={gift} />;
    },
  },
];
