"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Trash2, Pencil, Plus, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Gift } from "@/types/Gift";
import Link from "next/link";
import { getSession, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const GiftRowButton = ({ gift }: { gift: Gift }) => {
  const router = useRouter();

  const { data: session } = useSession();
  const roleCode = String((session as any)?.user?.role ?? "").toLowerCase();
  const isManager = roleCode === "adm";

  const [addStockOpen, setAddStockOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loadingStock, setLoadingStock] = useState(false);

  const handleAddStock = async () => {
    if (!amount || Number(amount) <= 0) { toast.warning("กรุณากรอกจำนวน"); return; }
    setLoadingStock(true);
    try {
      const s = await getSession();
      const token = (s as any)?.user?.accessToken;
      const res = await fetch(`${API_BASE_URL}/gifts/${gift.id}/add_stock/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      if (res.ok) { toast.success(`เพิ่ม stock +${amount} สำเร็จ`); setAddStockOpen(false); setAmount(""); router.refresh(); }
      else { toast.error("เพิ่ม stock ไม่สำเร็จ"); }
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    setLoadingStock(false);
  };

  const handleDelete = async () => {
    const ok = window.confirm("ต้องการลบของแถมนี้ใช่ไหม?\n(ลบแล้วกู้คืนไม่ได้)");
    if (!ok) return;

    try {
      const s = await getSession();
      const token = (s as any)?.user?.accessToken;

      if (!token) {
        alert("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/gifts/${gift.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        alert("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        alert("คุณไม่มีสิทธิ์ลบ (ผู้จัดการเท่านั้น)");
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Delete gift failed:", res.status, text);
        alert(`ลบไม่สำเร็จ (${res.status})`);
        return;
      }

      router.refresh();
    } catch (e) {
      console.error(e);
      alert("ลบไม่สำเร็จ (เกิดข้อผิดพลาด)");
    }
  };

  return (
    <>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {/* ดู */}
        <Link href={`/gifts/${gift.id}`}>
          <DropdownMenuItem className="flex justify-between">
            <Eye className="opacity-60" />
            ดู
          </DropdownMenuItem>
        </Link>

        {/* เพิ่ม Stock: ทุก role */}
        <DropdownMenuItem
          onClick={() => { setAmount(""); setAddStockOpen(true); }}
          className="flex justify-between gap-2"
        >
          <Plus className="opacity-60 h-4 w-4" />
          เพิ่ม Stock
        </DropdownMenuItem>

        {/* ✏️ แก้ไข: เฉพาะผู้จัดการ */}
        {isManager && (
          <DropdownMenuItem
            onClick={() => router.push(`/gifts/${gift.id}/edit`)}
            className="flex justify-between"
          >
            <Pencil className="opacity-60" />
            แก้ไข
          </DropdownMenuItem>
        )}

        {/* 🗑️ ลบ: เฉพาะผู้จัดการ */}
        {isManager && (
          <DropdownMenuItem
            onClick={handleDelete}
            className="flex justify-between text-red-600 focus:text-red-600"
          >
            <Trash2 className="opacity-60" />
            ลบ
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={addStockOpen} onOpenChange={setAddStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่ม Stock — {gift.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-500">คงเหลือปัจจุบัน: <span className="font-semibold">{gift.stock}</span></p>
            <Input type="number" min={1} placeholder="จำนวนที่เพิ่ม" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">ยกเลิก</Button></DialogClose>
            <Button onClick={handleAddStock} disabled={loadingStock}>
              {loadingStock ? "กำลังเพิ่ม..." : "เพิ่ม Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GiftRowButton;