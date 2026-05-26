"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { MoreHorizontal, Eye, Trash2, Pencil, Plus } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift } from "@/types/Gift";
import Link from "next/link";
import { getSession, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GiftRowButton = ({ gift }: { gift: Gift }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const roleCode = String((session as any)?.user?.role ?? "").toLowerCase();
  const isManager = roleCode === "adm";

  const [addStockOpen, setAddStockOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddStock = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.warning("กรุณากรอกจำนวน");
      return;
    }
    setLoading(true);
    try {
      const s = await getSession();
      const token = (s as any)?.user?.accessToken;
      const res = await fetch(`${API_BASE_URL}/gifts/${gift.id}/add_stock/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      if (res.ok) {
        toast.success(`เพิ่ม stock +${amount} สำเร็จ`);
        setAddStockOpen(false);
        setAmount("");
        router.refresh();
      } else {
        toast.error("เพิ่ม stock ไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    const ok = window.confirm("ต้องการลบของแถมนี้ใช่ไหม?\n(ลบแล้วกู้คืนไม่ได้)");
    if (!ok) return;
    try {
      const s = await getSession();
      const token = (s as any)?.user?.accessToken;
      const res = await fetch(`${API_BASE_URL}/gifts/${gift.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        toast.error("เฉพาะผู้จัดการเท่านั้นที่สามารถลบได้");
        return;
      }
      if (res.ok) {
        toast.success(`ลบ ${gift.name} สำเร็จ`);
        router.refresh();
      } else {
        toast.error("ลบไม่สำเร็จ");
      }
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <Link href={`/gifts/${gift.id}`}>
            <DropdownMenuItem className="flex justify-between gap-2">
              <Eye className="opacity-60 h-4 w-4" />
              ดู
            </DropdownMenuItem>
          </Link>

          <DropdownMenuItem
            onClick={() => { setAmount(""); setAddStockOpen(true); }}
            className="flex justify-between gap-2"
          >
            <Plus className="opacity-60 h-4 w-4" />
            เพิ่ม Stock
          </DropdownMenuItem>

          {isManager && (
            <DropdownMenuItem
              onClick={() => router.push(`/gifts/${gift.id}/edit`)}
              className="flex justify-between gap-2"
            >
              <Pencil className="opacity-60 h-4 w-4" />
              แก้ไข
            </DropdownMenuItem>
          )}

          {isManager && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="flex justify-between gap-2 text-red-600 focus:text-red-600"
              >
                <Trash2 className="opacity-60 h-4 w-4" />
                ลบ
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={addStockOpen} onOpenChange={setAddStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่ม Stock — {gift.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              คงเหลือปัจจุบัน: <span className="font-semibold">{gift.stock}</span>
            </p>
            <Input
              type="number"
              min={1}
              placeholder="จำนวนที่เพิ่ม"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">ยกเลิก</Button>
            </DialogClose>
            <Button onClick={handleAddStock} disabled={loading}>
              {loading ? "กำลังเพิ่ม..." : "เพิ่ม Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GiftRowButton;