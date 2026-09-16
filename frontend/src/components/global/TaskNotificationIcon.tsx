"use client";
// TaskNotificationIcon.tsx
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getTaskPosts } from "@/services/TaskService";

const TaskNotificationIcon = () => {
  const { data: session, status } = useSession();
  const userInfo = session?.user as any;
  const [pendingCount, setPendingCount] = useState(0);

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
            p.assignments.some((a) => a.employee_username === myUsername && a.status === "pending")
        ).length;
        setPendingCount(count);
      } catch (error) {
        console.error("ดึงจำนวนงานค้างไม่สำเร็จ:", error);
      }
    };

    fetchCount();
  }, [status, userInfo?.username]);

  return (
    <Link
      href="/tasks"
      className="relative p-2 rounded-xl hover:bg-orange-500 hover:shadow-lg hover:scale-110 transition-all duration-300"
      title="งานที่มอบหมาย"
    >
      <ClipboardList size={20} strokeWidth={2.5} className="text-white" />
      {pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
          {pendingCount}
        </span>
      )}
    </Link>
  );
};

export default TaskNotificationIcon;
