"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface Issue {
  id: number;
  title: string;
  priority: string;
  priority_display: string;
  category_display: string;
  status: string;
}

// ✅ กันไม่ให้ popup ขึ้นซ้ำในเซสชันเดียวกัน (ปิดแล้วไม่เด้งอีกจนกว่าจะ login ใหม่จริงๆ)
const SESSION_FLAG_KEY = "issueNotificationShownThisSession";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-500 text-white";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-yellow-500 text-white";
    case "low":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

/**
 * Popup แจ้งเตือนกระทู้/ปัญหาที่ยังเปิดอยู่ - เด้งขึ้นมาครั้งเดียวตอน login
 * (เช็คด้วย sessionStorage กันเด้งซ้ำระหว่าง session เดียวกัน แต่จะเด้งใหม่ทุกครั้งที่ login ใหม่)
 * วางไว้ใน layout ของโซน private (หลัง login) เพื่อให้ทำงานไม่ว่าจะเข้าหน้าไหนก่อนก็ตาม
 */
const IssueLoginNotification = () => {
  const { data: session, status } = useSession();
  const [openIssues, setOpenIssues] = useState<Issue[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    // ✅ ขึ้นแค่ครั้งเดียวต่อ session (ปิดแล้วจะไม่เด้งอีกจนกว่าจะ login รอบใหม่)
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_FLAG_KEY)) return;

    const fetchOpenIssues = async () => {
      try {
        const res = await fetch("/api/issues/");
        const data = await res.json();
        const issues: Issue[] = Array.isArray(data) ? data : [];
        const stillOpen = issues.filter((i) => i.status !== "resolved");

        if (stillOpen.length > 0) {
          // ✅ เร่งด่วน/สูงขึ้นก่อน จะได้เห็นอันสำคัญก่อน
          const priorityOrder: Record<string, number> = {
            urgent: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          stillOpen.sort(
            (a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
          );
          setOpenIssues(stillOpen);
          setDialogOpen(true);
        }
      } catch (error) {
        console.error("❌ ดึงกระทู้ที่ยังเปิดอยู่ไม่สำเร็จ:", error);
      } finally {
        sessionStorage.setItem(SESSION_FLAG_KEY, "1");
      }
    };

    fetchOpenIssues();
  }, [status]);

  if (openIssues.length === 0) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            มีกระทู้/ปัญหาที่ยังไม่ปิด {openIssues.length} รายการ
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto space-y-2 my-2">
          {openIssues.slice(0, 8).map((issue) => (
            <Link
              key={issue.id}
              href={`/issues/${issue.id}`}
              onClick={() => setDialogOpen(false)}
              className="flex items-center justify-between gap-2 p-3 rounded-lg border hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm font-medium truncate flex-1">{issue.title}</span>
              <div className="flex gap-1 shrink-0">
                <Badge className={getPriorityColor(issue.priority)}>
                  {issue.priority_display}
                </Badge>
              </div>
            </Link>
          ))}
          {openIssues.length > 8 && (
            <p className="text-xs text-center text-gray-400 pt-1">
              และอีก {openIssues.length - 8} รายการ
            </p>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
            ปิด
          </Button>
          <Link href="/issues" onClick={() => setDialogOpen(false)}>
            <Button type="button">ดูกระทู้ทั้งหมด</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IssueLoginNotification;