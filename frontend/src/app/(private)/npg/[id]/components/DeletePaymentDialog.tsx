"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import type { Payment } from "./PaymentRowButtons";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DeletePaymentDialogProps {
  payment: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

const DeletePaymentDialog = ({ payment, open, onOpenChange, onDeleted }: DeletePaymentDialogProps) => {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return; // ✅ กันกดซ้ำ
    setIsDeleting(true);
    try {
      const session = await getSession();
      const token = (session as any)?.user?.accessToken;

      if (!token) {
        toast.error("ไม่พบ Token", { description: "กรุณาเข้าสู่ระบบใหม่" });
        setIsDeleting(false);
        router.push("/login");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/npg/payments/${payment.id}/delete_payment/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        toast.error("Session หมดอายุ", { description: "กรุณาเข้าสู่ระบบใหม่" });
        router.push("/login");
        return;
      }

      if (res.status === 403) {
        toast.error("ไม่มีสิทธิ์", { description: "เฉพาะผู้ดูแลระบบเท่านั้นที่ลบได้" });
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("ลบไม่สำเร็จ", { description: err.error || `เกิดข้อผิดพลาด (${res.status})` });
        return;
      }

      toast.success("ลบรายการชำระเงินสำเร็จ", {
        description: `งวดที่ ${payment.installment_number} ถูกลบแล้ว ระบบคำนวณยอดคงเหลือใหม่ให้แล้ว`,
      });
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      console.error("Delete payment error:", error);
      toast.error("เกิดข้อผิดพลาด", {
        description: error instanceof Error ? error.message : "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isDeleting && onOpenChange(o)}>
      <DialogContent
        onPointerDownOutside={(e) => isDeleting && e.preventDefault()}
        onEscapeKeyDown={(e) => isDeleting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>ลบรายการชำระเงิน?</DialogTitle>
          <DialogDescription>
            ต้องการลบการชำระเงิน <strong>งวดที่ {payment.installment_number}</strong> จำนวน{" "}
            <strong>{Number(payment.amount_paid || 0).toLocaleString()} บาท</strong> ใช่ไหม?
          </DialogDescription>
        </DialogHeader>
        {/* ✅ ย้ายกล่องเตือนออกจาก DialogDescription (เดิม div ซ้อนใน p ทำให้ React เตือน hydration) */}
        <div className="space-y-2 text-sm">
          <div className="bg-slate-100 p-3 rounded-lg">ระบบจะคำนวณยอดคงเหลือของบัญชีใหม่ทั้งหมดทันทีหลังลบ</div>
          <div className="text-red-600 font-medium">⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้</div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            ยกเลิก
          </Button>
          <Button onClick={handleDelete} disabled={isDeleting} variant="destructive" className="gap-2">
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                ยืนยันลบ
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeletePaymentDialog;