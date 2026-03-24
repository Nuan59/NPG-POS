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
import { IEmployee } from "@/types/IEmployee";
import { Badge } from "@/components/ui/badge";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const EmployeeColumns: ColumnDef<IEmployee>[] = [
  {
    accessorKey: "name",
    header: "ชื่อลูกค้า",
  },
  {
    accessorKey: "username",
    header: "ชื่อผู้ใช้",
  },
  {
    accessorKey: "role",
    header: "บทบาท",
    cell: ({ row }) =>
      row.original.role === "adm" ? (
        <Badge>ผู้จัดการ</Badge>
      ) : (
        <Badge variant={"secondary"}>พนักงาน</Badge>
      ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const employee = row.original;
      const router = useRouter();

      const handleDelete = async () => {
        const ok = window.confirm(
          "ต้องการลบพนักงานนี้ใช่ไหม?\n(ลบแล้วกู้คืนไม่ได้)"
        );
        if (!ok) return;

        const session = await getSession();
        const token = (session as any)?.user?.accessToken;
        const role = (session as any)?.user?.role;
        const myUsername = (session as any)?.user?.username;

        if (role !== "adm") {
          alert("เฉพาะผู้จัดการเท่านั้นที่สามารถลบได้");
          return;
        }

        if (myUsername === employee.username) {
          alert("ไม่สามารถลบตัวเองได้");
          return;
        }

        const res = await fetch(
          `${API_BASE_URL}/employees/${employee.id}/`,
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
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <Link href={`/employees/${employee.id}`}>
              <DropdownMenuItem className="flex justify-between">
                <Eye className="opacity-60" />
                ดู
              </DropdownMenuItem>
            </Link>

            <Link href={`/employees/${employee.id}/edit`}>
              <DropdownMenuItem className="flex justify-between">
                <Pencil className="opacity-60" />
                แก้ไข
              </DropdownMenuItem>
            </Link>

            {/* ✅ ลบ (เฉพาะผู้จัดการ) */}
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
