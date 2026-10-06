"use client";
// RegisterCustomerBikeDialog.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/OrderCard/components/RegisterCustomerBikeDialog.tsx
// (วางตำแหน่งเดียวกับ OrderOwnedBikeSelect.tsx - ปรับ path ตามจริงถ้าไม่ตรง)
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { getSession } from "next-auth/react";
import { toast } from "sonner";
import { IBike } from "@/types/Bike";

interface RegisterCustomerBikeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: (bike: IBike) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * ลงทะเบียนรถของลูกค้าที่ไม่ได้ซื้อกับเรา (เช่น มาเปลี่ยนถ่ายน้ำมันเครื่องอย่างเดียว)
 * สร้างเป็น Bike แถวใหม่ category="customer_owned" - ไม่นับเป็นสต็อกขาย
 * เลขตัวถังไม่บังคับ เพราะลูกค้าอาจจำไม่ได้
 */
const RegisterCustomerBikeDialog = ({ open, onOpenChange, onRegistered }: RegisterCustomerBikeDialogProps) => {
  const [modelName, setModelName] = useState("");
  const [registrationPlate, setRegistrationPlate] = useState("");
  const [chassi, setChassi] = useState("");
  const [color, setColor] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setModelName("");
    setRegistrationPlate("");
    setChassi("");
    setColor("");
  };

  const handleSave = async () => {
    if (!modelName.trim()) {
      toast.error("กรุณากรอกยี่ห้อ/รุ่นรถ");
      return;
    }

    setSaving(true);
    try {
      const session = await getSession();
      const token = (session as any)?.user?.accessToken;

      const res = await fetch(`${API_BASE_URL}/inventory/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_name: modelName.trim(),
          model_code: "",
          chassi: chassi.trim() || null,
          registration_plate: registrationPlate.trim(),
          color: color.trim(),
          category: "customer_owned",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("ลงทะเบียนไม่สำเร็จ", { description: err.error || err.chassi?.[0] || "เกิดข้อผิดพลาด" });
        setSaving(false);
        return;
      }

      const newBike = await res.json();
      toast.success("ลงทะเบียนรถลูกค้าแล้ว");
      onRegistered(newBike);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ลงทะเบียนรถลูกค้า</DialogTitle>
          <DialogDescription>สำหรับลูกค้าที่ไม่ได้ซื้อรถกับร้าน (เช่น มารับบริการเปลี่ยนถ่ายน้ำมันเครื่อง)</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>ยี่ห้อ/รุ่นรถ *</Label>
            <Input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="เช่น Honda PCX160"
            />
          </div>
          <div>
            <Label>ทะเบียนรถ</Label>
            <Input
              value={registrationPlate}
              onChange={(e) => setRegistrationPlate(e.target.value)}
              placeholder="เช่น 1กก-1234 กรุงเทพฯ"
            />
          </div>
          <div>
            <Label>เลขตัวถัง (ถ้ามี)</Label>
            <Input
              value={chassi}
              onChange={(e) => setChassi(e.target.value)}
              placeholder="ไม่บังคับ ถ้าลูกค้าจำไม่ได้เว้นว่างได้"
            />
          </div>
          <div>
            <Label>สี</Label>
            <Input value={color} onChange={(e) => setColor(e.target.value)} />
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

export default RegisterCustomerBikeDialog;