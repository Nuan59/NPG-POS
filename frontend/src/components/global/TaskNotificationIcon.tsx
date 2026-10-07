"use client";
// TaskNotificationIcon.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/TaskNotificationIcon.tsx
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getTaskPosts } from "@/services/TaskService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * ไอคอนถาวรใน Navbar สำหรับเช็คงานที่ถูกมอบหมาย - กดแล้วพาไปหน้า /tasks
 * แสดงตัวเลขจำนวนงานค้าง (ยังไม่ทำ) ของตัวเอง ถ้าไม่มีงานค้างจะไม่โชว์ badge
 * ✅ นับรวมเรื่องเงินสดด้วย: พนักงาน = เงินสดค้างส่ง (นับเป็น 1 ถ้ามี), adm = ใบส่งเงินที่รอรับ
 */
const TaskNotificationIcon = () => {
  const { data: session, status } = useSession();
  const userInfo = session?.user as any;
  const [pendingCount, setPendingCount] = useState(0);
  const [cashCount, setCashCount] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    const myUsername = userInfo?.username;
    if (!myUsername) return;

    const fetchCount = async () => {
      try {
        const posts = await getTaskPosts();
        const count = posts.filter(
          (p) =>
            p.post_type === "assigned" &&
            p.assignments.some((a) => a.employee_username === myUsername && a.status !== "done")
        ).length;
        setPendingCount(count);
      } catch (error) {
        console.error("❌ ดึงจำนวนงานค้างไม่สำเร็จ:", error);
      }
    };

    const fetchCashCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cash-handover/summary/`, {
          headers: { Authorization: `Bearer ${userInfo?.accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        // adm: จำนวนใบที่รอรับ / พนักงาน: มีเงินสดค้างส่ง = 1 งาน
        setCashCount((data.pending_to_receive || 0) + (data.unsent_count > 0 ? 1 : 0));
      } catch (error) {
        console.error("❌ ดึงจำนวนเงินค้างส่งไม่สำเร็จ:", error);
      }
    };

    fetchCount();
    fetchCashCount();
  }, [status, userInfo?.username]);

  const totalCount = pendingCount + cashCount;

  return (
    <Link
      href="/tasks"
      className="relative p-2 rounded-xl hover:bg-orange-500 hover:shadow-lg hover:scale-110 transition-all duration-300"
      title={cashCount > 0 ? "งานที่มอบหมาย / ส่งเงิน" : "งานที่มอบหมาย"}
    >
      <ClipboardList size={20} strokeWidth={2.5} className="text-white" />
      {totalCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
          {totalCount}
        </span>
      )}
    </Link>
  );
};

export default TaskNotificationIcon;