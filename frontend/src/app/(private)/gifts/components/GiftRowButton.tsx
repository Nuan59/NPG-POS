"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Trash2, Pencil } from "lucide-react";
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
    <DropdownMenu>
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
  );
};

export default GiftRowButton;
