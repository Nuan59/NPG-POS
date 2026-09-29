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
import { ClipboardCheck, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { getTaskPosts, TaskPost, TaskAssignment } from "@/services/TaskService";

// ✅ กันไม่ให้ popup ขึ้นซ้ำในเซสชันเดียวกัน (ปิดแล้วไม่เด้งอีกจนกว่าจะ login ใหม่จริงๆ)
const SESSION_FLAG_KEY = "taskNotificationShownThisSession";

interface MyTaskRow {
  post: TaskPost;
  assignment: TaskAssignment;
}

const formatDueDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

/**
 * Popup แจ้งเตือนงานที่ถูกมอบหมายให้ตัวเองแล้วยังไม่ได้ทำ - เด้งขึ้นมาครั้งเดียวตอน login
 * (เช็คด้วย sessionStorage กันเด้งซ้ำระหว่าง session เดียวกัน แต่จะเด้งใหม่ทุกครั้งที่ login ใหม่)
 * เรียงงานที่เกินกำหนด/ใกล้ครบกำหนดขึ้นก่อน พร้อมโชว์วันครบกำหนดให้เห็นชัด
 */
const TaskLoginNotification = () => {
  const { data: session, status } = useSession();
  const userInfo = session?.user as any;
  const [rows, setRows] = useState<MyTaskRow[]>([]);
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
        const myRows: MyTaskRow[] = [];
        posts.forEach((p) => {
          if (p.post_type !== "assigned") return;
          p.assignments.forEach((a) => {
            if (a.employee_username === myUsername && a.status !== "done") {
              myRows.push({ post: p, assignment: a });
            }
          });
        });

        // ✅ เรียงเกินกำหนดก่อน แล้วใกล้ครบกำหนด แล้วค่อยที่เหลือ
        myRows.sort((a, b) => {
          const rank = (r: MyTaskRow) => (r.assignment.is_overdue ? 0 : r.assignment.is_due_soon ? 1 : 2);
          return rank(a) - rank(b);
        });

        if (myRows.length > 0) {
          setRows(myRows);
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

  if (rows.length === 0) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-orange-600" />
            มีงานที่มอบหมายให้คุณ {rows.length} รายการ
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto space-y-2 my-2">
          {rows.slice(0, 8).map(({ post, assignment }) => (
            <div key={assignment.id} className="p-3 rounded-lg border">
              <p className="text-sm font-medium whitespace-pre-wrap">{post.content}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400">โดย {post.created_by}</p>
                {assignment.due_date && (
                  <span
                    className={`text-xs font-bold flex items-center gap-1 ${
                      assignment.is_overdue
                        ? "text-red-600"
                        : assignment.is_due_soon
                        ? "text-amber-600"
                        : "text-gray-400 font-normal"
                    }`}
                  >
                    {assignment.is_overdue && <AlertTriangle size={12} />}
                    {assignment.is_due_soon && !assignment.is_overdue && <Clock size={12} />}
                    {assignment.is_overdue ? "เกินกำหนด " : assignment.is_due_soon ? "ใกล้ครบกำหนด " : "กำหนด "}
                    {formatDueDate(assignment.due_date)}
                  </span>
                )}
              </div>
            </div>
          ))}
          {rows.length > 8 && (
            <p className="text-xs text-center text-gray-400 pt-1">
              และอีก {rows.length - 8} รายการ
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