"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-orange-100 p-6">
            <FileQuestion className="w-16 h-16 text-orange-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            ไม่พบข้อมูลลูกค้า
          </h1>
          <p className="text-gray-600">
            ไม่สามารถโหลดข้อมูลลูกค้าได้
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/customers">
            <Button variant="default" className="w-full sm:w-auto">
              กลับไปหน้ารายการลูกค้า
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto"
          >
            ลองใหม่อีกครั้ง
          </Button>
        </div>
      </div>
    </div>
  );
}