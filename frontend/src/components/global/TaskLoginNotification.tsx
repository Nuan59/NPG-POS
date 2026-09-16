"use client";
// TaskLoginNotification.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/TaskLoginNotification.tsx
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { getTaskPosts, TaskPost } from "@/services/TaskService";

// ✅ กันไม่ให้ popup ขึ้นซ้ำในเซสชันเดียวกัน (ปิดแล้วไม่เด้งอีกจนกว่าจะ login ใหม่จริงๆ)
const SESSION_FLAG_KEY = "taskNotificationShownThisSession";

/**
 * Popup แจ้งเตือนงานที่ถูกมอบหมายให้ตัวเองแล้วยังไม่ได้ทำ - เด้งขึ้นมาครั้งเดียวตอน login
 * (เช็คด้วย sessionStorage กันเด้งซ้ำระหว่าง session เดียวกัน แต่จะเด้งใหม่ทุกครั้งที่ login ใหม่)
 * วางไว้ใน layout ของโซน private (หลัง login) เพื่อให้ทำงานไม่ว่าจะเข้าหน้าไหนก่อนก็ตาม
 * (พนักงานทั่วไปเข้าหน้า /employees ไม่ได้ แต่ต้องเห็น popup นี้ได้ปกติ)
 */
const TaskLoginNotification = () => {
  const { data: session, status } = useSession();
  const userInfo = session?.user as any;
  const [pendingPosts, setPendingPosts] = useState<TaskPost[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_FLAG_KEY)) return;

    const myUsername = userInfo?.username;
    if (!myUsername) return;

    const fetchPendingTasks = async () => {
      try {
        const posts = await getTaskPosts();
        const myPending = posts.filter(
          (p) =>
            p.post_type === "assigned" &&
            p.assignments.some((a) => a.employee_username === myUsername && a.status === "pending")
        );

        if (myPending.length > 0) {
          setPendingPosts(myPending);
          setDialogOpen(true);
        }
      } catch (error) {
        console.error("❌ ดึงงานที่มอบหมายไม่สำเร็จ:", error);
      } finally {
        sessionStorage.setItem(SESSION_FLAG_KEY, "1");
      }
    };

    fetchPendingTasks();
  }, [status, userInfo?.username]);

  if (pendingPosts.length === 0) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-600" />
            มีงานที่มอบหมายให้คุณ {pendingPosts.length} รายการ
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto space-y-2 my-2">
          {pendingPosts.slice(0, 8).map((post) => (
            <div key={post.id} className="p-3 rounded-lg border">
              <p className="text-sm font-medium whitespace-pre-wrap">{post.content}</p>
              <p className="text-xs text-gray-400 mt-1">โดย {post.created_by}</p>
            </div>
          ))}
          {pendingPosts.length > 8 && (
            <p className="text-xs text-center text-gray-400 pt-1">
              และอีก {pendingPosts.length - 8} รายการ
            </p>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
            ปิด
          </Button>
          <Link href="/tasks" onClick={() => setDialogOpen(false)}>
            <Button type="button">ดูงานทั้งหมด</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskLoginNotification;