"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { IStorage } from "@/types/Storage";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const StorageColumns: ColumnDef<IStorage>[] = [
  {
    accessorKey: "storage_name",
    header: "ชื่อสถานที่จัดเก็บ",
  },
  {
    accessorKey: "address",
    header: "ที่อยู่",
    cell: ({ row }) => {
      const storage = row.original;
      return <div className="text-center">{storage.address}</div>;
    },
  },
  {
    accessorKey: "phone",
    header: "โทรศัพท์",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const storage = row.original;
      const router = useRouter();

      const handleDelete = async () => {
        const ok = window.confirm(
          "ต้องการลบสถานที่จัดเก็บนี้ใช่ไหม?\n(ลบแล้วกู้คืนไม่ได้)"
        );
        if (!ok) return;

        const session = await getSession();
        const token = (session as any)?.user?.accessToken;
        const role = (session as any)?.user?.role;

        if (!token) {
          alert("ไม่พบ token กรุณาเข้าสู่ระบบใหม่");
          return;
        }

        if (role !== "adm") {
          alert("เฉพาะผู้จัดการเท่านั้นที่สามารถลบได้");
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/storage/${storage.id}/`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          alert("ลบไม่สำเร็จ");
          return;
        }

        router.refresh();
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">เปิดเมนู</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <Link href={`/storage/${storage.id}`}>
              <DropdownMenuItem className="flex justify-between">
                <Eye className="opacity-60" />
                ดู
              </DropdownMenuItem>
            </Link>

            <Link href={`/storage/${storage.id}/edit`}>
              <DropdownMenuItem className="flex justify-between">
                <Pencil className="opacity-60" />
                แก้ไข
              </DropdownMenuItem>
            </Link>

            {/* ลบ (เฉพาะผู้จัดการ) */}
            <DropdownMenuItem
              onClick={handleDelete}
              className="flex justify-between text-red-600 focus:text-red-600"
            >
              <Trash2 className="opacity-60" />
              ลบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
