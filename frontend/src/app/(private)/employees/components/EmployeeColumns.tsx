"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, MoreHorizontal, Pencil, Trash2, ShieldCheck, Ban, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { IEmployee } from "@/types/IEmployee";
import { Badge } from "@/components/ui/badge";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PermissionsDialog from "./PermissionsDialog";
import { toggleEmployeeActive } from "@/services/EmployeeService";

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
    cell: ({ row }) => {
      // ✅ is_active มาจาก AbstractUser ของ Django ค่า default = true, undefined ก็ถือว่าเปิดใช้งานอยู่
      const isActive = (row.original as any).is_active !== false;
      return (
        <div className="flex items-center gap-2">
          {row.original.role === "adm" ? (
            <Badge>ผู้จัดการ</Badge>
          ) : (
            <Badge variant={"secondary"}>พนักงาน</Badge>
          )}
          {!isActive && (
            <Badge variant="destructive" className="text-xs">
              ปิดใช้งาน
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const employee = row.original;
      const router = useRouter();
      const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
      const [dropdownOpen, setDropdownOpen] = useState(false);

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
          // ✅ อ่านข้อความ error จริงจาก backend (เช่น "มีประวัติการขายผูกอยู่")
          // แทนที่จะโชว์ "ลบไม่สำเร็จ" เฉยๆ ทุกกรณีเหมือนเดิม
          let message = "ลบไม่สำเร็จ";
          try {
            const errorData = await res.json();
            message = errorData.message || message;
          } catch {
            // ถ้า response ไม่ใช่ JSON ก็ใช้ข้อความ default ไป
          }
          alert(message);
          return;
        }

        router.refresh();
      };

      const isActive = (employee as any).is_active !== false;

      const handleToggleActive = async () => {
        const session = await getSession();
        const role = (session as any)?.user?.role;
        const myUsername = (session as any)?.user?.username;

        if (role !== "adm") {
          alert("เฉพาะผู้จัดการเท่านั้นที่สามารถเปิด/ปิดการใช้งานได้");
          return;
        }

        if (myUsername === employee.username) {
          alert("ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้");
          return;
        }

        const actionText = isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน";
        const ok = window.confirm(
          isActive
            ? `ต้องการปิดการใช้งาน "${employee.name}" ใช่ไหม?\n(พนักงานจะ login เข้าระบบไม่ได้อีก แต่ประวัติการขายเดิมยังอยู่ครบ)`
            : `ต้องการเปิดการใช้งาน "${employee.name}" อีกครั้งใช่ไหม?`
        );
        if (!ok) return;

        const result = await toggleEmployeeActive(employee.id!);

        if (!result?.success) {
          alert(result?.message || `${actionText}ไม่สำเร็จ`);
          return;
        }

        router.refresh();
      };

      return (
        <>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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

              {/* ✅ กำหนดสิทธิ์แบบด่วน - เฉพาะพนักงาน (ผู้จัดการเข้าได้ทุกหน้าอยู่แล้ว) */}
              {employee.role !== "adm" && (
                <DropdownMenuItem
                  onClick={() => {
                    setDropdownOpen(false);
                    setPermissionsDialogOpen(true);
                  }}
                  className="flex justify-between"
                >
                  <ShieldCheck className="opacity-60" />
                  กำหนดสิทธิ์
                </DropdownMenuItem>
              )}

              {/* ✅ เปิด/ปิดการใช้งาน (เฉพาะผู้จัดการกดได้จริง, ห้ามปิดตัวเอง - เช็คใน handler) */}
              <DropdownMenuItem
                onClick={handleToggleActive}
                className={`flex justify-between ${
                  isActive ? "text-amber-600 focus:text-amber-600" : "text-green-600 focus:text-green-600"
                }`}
              >
                {isActive ? (
                  <Ban className="opacity-60" />
                ) : (
                  <CheckCircle2 className="opacity-60" />
                )}
                {isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
              </DropdownMenuItem>

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

          <PermissionsDialog
            employee={employee}
            open={permissionsDialogOpen}
            onOpenChange={setPermissionsDialogOpen}
            onSaved={() => router.refresh()}
          />
        </>
      );
    },
  },
];