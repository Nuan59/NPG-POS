"use client";
// AnnouncementDialog.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/issues/components/AnnouncementDialog.tsx
// (หรือโฟลเดอร์ components ที่ issues/page.tsx ใช้อยู่ - ปรับ path import ให้ตรงถ้าจำเป็น)
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Announcement, createAnnouncement, updateAnnouncement } from "@/services/AnnouncementService";

interface AnnouncementDialogProps {
  // ✅ ไม่ส่ง announcement มา = โหมดสร้างใหม่ / ส่งมา = โหมดแก้ไข (pattern เดียวกับ dialog อื่นในแอป
  // เช่น AdditionalFeeDialog, OrderGiftDialog ที่ใช้ component เดียวกันทั้งสร้างและแก้)
  announcement?: Announcement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const AnnouncementDialog = ({ announcement, open, onOpenChange, onSaved }: AnnouncementDialogProps) => {
  const isEdit = !!announcement;

  const [content, setContent] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ พอ dialog เปิดขึ้นมาใหม่ (ทั้งสร้าง/แก้) เติมค่าเริ่มต้นให้ตรงกับโหมด
  useEffect(() => {
    if (open) {
      setContent(announcement?.content || "");
      setDetail(announcement?.detail || "");
    }
  }, [open, announcement]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("กรุณากรอกข้อความประกาศ");
      return;
    }
    setSaving(true);
    const result = isEdit
      ? await updateAnnouncement(announcement!.id, { content: content.trim(), detail: detail.trim() })
      : await createAnnouncement({ content: content.trim(), detail: detail.trim() });
    setSaving(false);

    if (result.status === "success") {
      toast.success(isEdit ? "แก้ไขประกาศเรียบร้อยแล้ว" : "เพิ่มประกาศเรียบร้อยแล้ว");
      onOpenChange(false);
      onSaved();
    } else {
      toast.error(result.error || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขประกาศ" : "เพิ่มประกาศใหม่"}</DialogTitle>
          <DialogDescription>
            ข้อความสั้นจะไหลในแถบใต้เมนู ส่วนรายละเอียดจะโชว์เมื่อกดที่แถบ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>ข้อความประกาศ *</Label>
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="ข้อความสั้นที่จะไหลในแถบ..."
            />
          </div>
          <div>
            <Label>รายละเอียดเพิ่มเติม (ไม่บังคับ)</Label>
            <Textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="รายละเอียดเต็ม - โชว์ตอนกดที่แถบไหล"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementDialog;