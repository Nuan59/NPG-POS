"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const CreateIssuePage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "other",
    priority: "medium",
    customer_name: "",
    reference_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error("กรุณากรอกหัวข้อ");
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error("กรุณากรอกรายละเอียดปัญหา");
      return;
    }
    
    setLoading(true);

    try {
      // ✅ ดึง user ID อย่างปลอดภัย
      const userId = (session?.user as any)?.id;
      
      console.log("Creating issue with user ID:", userId);
      console.log("Form data:", formData);

      const payload = {
        ...formData,
        created_by_id: userId || null,
        status: "open",
      };

      console.log("Sending payload:", payload);

      const response = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Created issue:", data);
        
        toast.success("สร้างกระทู้สำเร็จ!");
        router.push(`/issues/${data.id}`);
      } else {
        const error = await response.json();
        console.error("Error response:", error);
        toast.error(error.error || "เกิดข้อผิดพลาดในการสร้างกระทู้");
      }
    } catch (error) {
      console.error("Create error:", error);
      toast.error("เกิดข้อผิดพลาด: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/issues">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </Button>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">สร้างกระทู้/แจ้งปัญหาใหม่</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายละเอียดปัญหา</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">หัวข้อ *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="เช่น ลูกค้าไม่ได้รับสินค้า, ระบบล่มไม่สามารถใช้งานได้"
                required
                className="text-base"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">รายละเอียดปัญหา *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="อธิบายปัญหาโดยละเอียด..."
                rows={6}
                required
                className="text-base"
              />
            </div>

            {/* Category and Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">หมวดหมู่ *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">ลูกค้า</SelectItem>
                    <SelectItem value="inventory">สินค้า</SelectItem>
                    <SelectItem value="system">ระบบ</SelectItem>
                    <SelectItem value="employee">พนักงาน</SelectItem>
                    <SelectItem value="finance">การเงิน</SelectItem>
                    <SelectItem value="other">อื่นๆ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">ระดับความสำคัญ *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">ต่ำ</SelectItem>
                    <SelectItem value="medium">กลาง</SelectItem>
                    <SelectItem value="high">สูง</SelectItem>
                    <SelectItem value="urgent">เร่งด่วน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">ชื่อลูกค้า (ถ้ามี)</Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="ชื่อลูกค้าที่เกี่ยวข้อง"
                  className="text-base"
                />
              </div>

              <div>
                <Label htmlFor="reference_id">เลขที่อ้างอิง (ถ้ามี)</Label>
                <Input
                  id="reference_id"
                  name="reference_id"
                  value={formData.reference_id}
                  onChange={handleChange}
                  placeholder="เช่น Order ID, เลขที่ใบเสร็จ"
                  className="text-base"
                />
              </div>
            </div>

            {/* Debug Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="p-3 bg-gray-100 rounded text-xs">
                <div>User ID: {(session?.user as any)?.id || 'ไม่พบ'}</div>
                <div>Session: {session ? 'มี' : 'ไม่มี'}</div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <Link href="/issues" className="w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full">
                  ยกเลิก
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "กำลังสร้าง..." : "สร้างกระทู้"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateIssuePage;