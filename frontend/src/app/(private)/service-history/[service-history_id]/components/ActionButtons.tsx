"use client";
// ActionButtons.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/service-history/[service-history_id]/components/ActionButtons.tsx
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { toast } from "sonner";
import { Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceRecord, getReceiptNumber } from "./serviceRecordUtil";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ActionButtonsProps {
  record: ServiceRecord;
}

const ActionButtons = ({ record }: ActionButtonsProps) => {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ ลบงานบริการ - ลบแค่รายการนี้ ไม่แตะรถ/สต็อกใดๆ (ไม่มีโหมด "คืนสินค้า" แบบงานขาย)
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const session = await getSession();
      const token = (session as any)?.user?.accessToken;
      const res = await fetch(`${API_BASE_URL}/service/${record.id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error(`ลบไม่สำเร็จ (${res.status})`);
        return;
      }
      toast.success("ลบรายการแล้ว");
      setConfirmOpen(false);
      router.push(record.bike ? `/service-history?bike=${record.bike.id}` : "/service-history");
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full flex justify-between">
      <Button className="flex items-center gap-2" variant={"destructive"} onClick={() => setConfirmOpen(true)}>
        <Trash2 size={"1rem"} opacity={"60%"} />
        ลบ
      </Button>

      <Link href={`/service-history/${record.id}/TempReceipt`}>
        <Button className="flex items-center gap-2">
          <Receipt size={"1rem"} opacity={"60%"} />
          ใบเสร็จชั่วคราว
        </Button>
      </Link>

      <Dialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบรายการ {getReceiptNumber(record.id)}?</DialogTitle>
            <DialogDescription>
              รายการนี้จะหายไปจากประวัติรถ (ไม่มีผลกับสต็อกหรือสถานะรถ) การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "กำลังลบ..." : "ยืนยันลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActionButtons;