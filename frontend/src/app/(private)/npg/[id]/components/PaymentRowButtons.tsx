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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

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

          {/* แก้ไข - เฉพาะ adm */}
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
          <Link href={`/npg/${accountId}/receipt?payment_id=${payment.id}`}>
            <DropdownMenuItem className="flex justify-between gap-2">
              <Receipt className="opacity-60 h-4 w-4" />
              ใบเสร็จรับเงิน
            </DropdownMenuItem>
          </Link>

          {/* ลบการชำระเงิน - เฉพาะ adm */}
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
            <DialogDescription>
              <div className="space-y-2 text-sm text-gray-700 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">วันที่ชำระ</span>
                  <span className="font-medium">{formatDate(payment.payment_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">งวดที่</span>
                  <span className="font-medium">{payment.installment_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">จำนวนเงิน</span>
                  <span className="font-medium text-green-600">
                    {payment.amount_paid.toLocaleString()} ฿
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">คงเหลือหลังชำระ</span>
                  <span className="font-medium">
                    {payment.remaining_balance_after.toLocaleString()} ฿
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">วิธีชำระ</span>
                  <span className="font-medium">{methodLabel()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">หมายเหตุ</span>
                  <span className="font-medium">{payment.note || "-"}</span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
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