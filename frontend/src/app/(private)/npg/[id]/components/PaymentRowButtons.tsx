"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, MoreHorizontal, Pencil, Receipt, Trash2 } from "lucide-react";
import Link from "next/link";
import DeletePaymentDialog from "./DeletePaymentDialog";

export interface Payment {
  id: number;
  payment_date: string;
  installment_number: number;
  amount_paid: number;
  remaining_balance_after: number;
  payment_method?: string;
  transfer_bank?: string;
  check_number?: string;
  late_fee?: number;
  note: string;
}

interface PaymentRowButtonsProps {
  payment: Payment;
  accountId: string;
  isAdmin: boolean;
  onEdit: (payment: Payment) => void;
  onDeleted: () => void;
}

const PaymentRowButtons = ({ payment, accountId, isAdmin, onEdit, onDeleted }: PaymentRowButtonsProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const methodLabel = () => {
    if (!payment.payment_method) return "-";
    if (payment.payment_method === "เงินโอน" && payment.transfer_bank) {
      return `เงินโอน (${payment.transfer_bank})`;
    }
    if (payment.payment_method === "เช็ค" && payment.check_number) {
      return `เช็ค เลขที่ ${payment.check_number}`;
    }
    return payment.payment_method;
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return !dateString || isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">เมนู</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {/* ดู */}
          <DropdownMenuItem
            className="flex justify-between gap-2"
            onClick={() => {
              setDropdownOpen(false);
              setShowViewDialog(true);
            }}
          >
            <Eye className="opacity-60 h-4 w-4" />
            ดู
          </DropdownMenuItem>

          {/* 🔒 แก้ไข - เฉพาะ adm */}
          {isAdmin && (
            <DropdownMenuItem
              className="flex justify-between gap-2"
              onClick={() => {
                setDropdownOpen(false);
                onEdit(payment);
              }}
            >
              <Pencil className="opacity-60 h-4 w-4" />
              แก้ไข
            </DropdownMenuItem>
          )}

          {/* ใบเสร็จรับเงิน */}
          <DropdownMenuItem asChild className="flex justify-between gap-2 cursor-pointer">
            <Link href={`/npg/${accountId}/receipt?payment_id=${payment.id}`}>
              <Receipt className="opacity-60 h-4 w-4" />
              ใบเสร็จรับเงิน
            </Link>
          </DropdownMenuItem>

          {/* 🔒 ลบการชำระเงิน - เฉพาะ adm */}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setDropdownOpen(false);
                  setShowDeleteDialog(true);
                }}
                className="flex justify-between gap-2 text-red-600 focus:text-red-600"
              >
                <Trash2 className="opacity-60 h-4 w-4" />
                ลบการชำระเงิน
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog ดู (view-only) */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รายละเอียดการชำระเงิน งวดที่ {payment.installment_number}</DialogTitle>
            <DialogDescription>ข้อมูลรายการที่บันทึกไว้</DialogDescription>
          </DialogHeader>
          {/* ✅ ย้ายเนื้อหาออกจาก DialogDescription (เดิม div ซ้อนใน p ทำให้ React เตือน hydration) */}
          <div className="divide-y divide-slate-100 text-sm tabular-nums">
            <div className="flex justify-between py-2">
              <span className="text-[#7A7A7A]">วันที่ชำระ</span>
              <span className="font-medium">{formatDate(payment.payment_date)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#7A7A7A]">งวดที่</span>
              <span className="font-medium">{payment.installment_number}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#7A7A7A]">จำนวนเงิน</span>
              <span className="font-semibold text-emerald-600">
                {Number(payment.amount_paid || 0).toLocaleString()} ฿
              </span>
            </div>
            {!!payment.late_fee && payment.late_fee > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-[#7A7A7A]">ค่าปรับล่าช้า</span>
                <span className="font-medium text-red-600">{payment.late_fee.toLocaleString()} ฿</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-[#7A7A7A]">คงเหลือหลังชำระ</span>
              <span className="font-medium">
                {Number(payment.remaining_balance_after || 0).toLocaleString()} ฿
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#7A7A7A]">วิธีชำระ</span>
              <span className="font-medium">{methodLabel()}</span>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <span className="text-[#7A7A7A] shrink-0">หมายเหตุ</span>
              <span className="font-medium text-right break-words">{payment.note || "-"}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog ยืนยันลบ */}
      <DeletePaymentDialog
        payment={payment}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDeleted={onDeleted}
      />
    </>
  );
};

export default PaymentRowButtons;