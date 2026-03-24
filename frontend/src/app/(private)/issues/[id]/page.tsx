"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CheckCircle, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface IssueUpdate {
  id: number;
  message: string;
  updated_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  old_status: string | null;
  new_status: string | null;
}

interface Issue {
  id: number;
  title: string;
  description: string;
  category: string;
  category_display: string;
  priority: string;
  priority_display: string;
  status: string;
  status_display: string;
  created_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  assigned_to?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  resolved_by?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  customer_name?: string;
  reference_id?: string;
  updates: IssueUpdate[];
}

const IssueDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateMessage, setUpdateMessage] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchIssue();
    }
  }, [params.id]);

  const fetchIssue = async () => {
    try {
      const response = await fetch(`/api/issues/${params.id}`);
      const data = await response.json();
      setIssue(data);
      setNewStatus(data.status);
    } catch (error) {
      console.error("Error fetching issue:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!updateMessage.trim()) {
      toast.error("กรุณาระบุข้อความอัปเดต");
      return;
    }

    setSubmitting(true);
    try {
      const userId = (session?.user as any)?.id;
      
      const response = await fetch(`/api/issues/${params.id}/add_update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: updateMessage,
          updated_by_id: userId,
          new_status: newStatus !== issue?.status ? newStatus : undefined,
        }),
      });

      if (response.ok) {
        toast.success("บันทึกการอัปเดตสำเร็จ");
        setUpdateMessage("");
        fetchIssue();
      } else {
        toast.error("เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Error adding update:", error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!confirm("คุณต้องการปิดกระทู้นี้ใช่หรือไม่?")) {
      return;
    }

    setSubmitting(true);
    try {
      const userId = (session?.user as any)?.id;
      
      const response = await fetch(`/api/issues/${params.id}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resolved_by_id: userId,
          message: "แก้ไขปัญหาเรียบร้อยแล้ว",
        }),
      });

      if (response.ok) {
        toast.success("ปิดกระทู้สำเร็จ");
        fetchIssue();
      } else {
        toast.error("เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Error resolving issue:", error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!confirm("คุณต้องการเปิดกระทู้นี้ใหม่ใช่หรือไม่?")) {
      return;
    }

    setSubmitting(true);
    try {
      const userId = (session?.user as any)?.id;
      
      const response = await fetch(`/api/issues/${params.id}/reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updated_by_id: userId,
          message: "เปิดกระทู้ใหม่",
        }),
      });

      if (response.ok) {
        toast.success("เปิดกระทู้ใหม่สำเร็จ");
        fetchIssue();
      } else {
        toast.error("เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error("Error reopening issue:", error);
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  if (loading) {
    return <div className="p-6">กำลังโหลด...</div>;
  }

  if (!issue) {
    return <div className="p-6">ไม่พบข้อมูล</div>;
  }

  return (
    <div className="h-screen flex flex-col p-6 max-w-6xl mx-auto">
      <Link href="/issues">
        <Button variant="ghost" className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </Button>
      </Link>

      {/* ใช้ ScrollArea ห่อทั้งหมด */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-3 gap-6 pr-4">
          {/* Main Content - Left 2 columns */}
          <div className="col-span-2 space-y-6">
            {/* Issue Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-3">{issue.title}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className={getPriorityColor(issue.priority)}>
                        {issue.priority_display}
                      </Badge>
                      <Badge variant="outline">{issue.category_display}</Badge>
                      <Badge variant="secondary">{issue.status_display}</Badge>
                    </div>
                  </div>
                  {issue.status !== "resolved" && (
                    <Button
                      onClick={handleResolve}
                      disabled={submitting}
                      className="gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      ปิดกระทู้
                    </Button>
                  )}
                  {issue.status === "resolved" && (
                    <Button
                      onClick={handleReopen}
                      disabled={submitting}
                      variant="outline"
                      className="gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      เปิดกระทู้ใหม่
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {issue.description}
                </p>
              </CardContent>
            </Card>

            {/* Updates Section - ใช้ ScrollArea ภายใน */}
            <Card>
              <CardHeader>
                <CardTitle>การอัปเดต ({issue.updates.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-4">
                    {issue.updates.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">ยังไม่มีการอัปเดต</p>
                    ) : (
                      issue.updates.map((update, index) => (
                        <div key={update.id}>
                          <div className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-bold">
                                {update.updated_by.first_name?.charAt(0) ||
                                  update.updated_by.username.charAt(0)}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold">
                                  {update.updated_by.first_name ||
                                    update.updated_by.username}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatDate(update.created_at)}
                                </span>
                              </div>
                              <p className="text-gray-700">{update.message}</p>
                              {update.old_status && update.new_status && (
                                <div className="mt-2 text-sm text-gray-500">
                                  เปลี่ยนสถานะจาก{" "}
                                  <Badge variant="outline">{update.old_status}</Badge> →{" "}
                                  <Badge variant="outline">{update.new_status}</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          {index < issue.updates.length - 1 && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Add Update Form */}
            {issue.status !== "resolved" && (
              <Card>
                <CardHeader>
                  <CardTitle>เพิ่มการอัปเดต</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="update-message">ข้อความอัปเดต *</Label>
                    <Textarea
                      id="update-message"
                      value={updateMessage}
                      onChange={(e) => setUpdateMessage(e.target.value)}
                      placeholder="อธิบายความคืบหน้า..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="status">เปลี่ยนสถานะ (ถ้าต้องการ)</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">เปิด</SelectItem>
                        <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
                        <SelectItem value="resolved">แก้ไขแล้ว</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleAddUpdate}
                    disabled={submitting}
                    className="w-full gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "กำลังบันทึก..." : "เพิ่มการอัปเดต"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right column - ใช้ sticky */}
          <div className="space-y-6">
            <Card className="sticky top-0">
              <CardHeader>
                <CardTitle>ข้อมูลกระทู้</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">สร้างโดย</Label>
                  <p className="font-semibold">
                    {issue.created_by.first_name || issue.created_by.username}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(issue.created_at)}
                  </p>
                </div>

                <Separator />

                {issue.assigned_to && (
                  <>
                    <div>
                      <Label className="text-xs text-gray-500">มอบหมายให้</Label>
                      <p className="font-semibold">
                        {issue.assigned_to.first_name || issue.assigned_to.username}
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {issue.resolved_by && (
                  <>
                    <div>
                      <Label className="text-xs text-gray-500">แก้ไขโดย</Label>
                      <p className="font-semibold">
                        {issue.resolved_by.first_name || issue.resolved_by.username}
                      </p>
                      {issue.resolved_at && (
                        <p className="text-sm text-gray-500">
                          {formatDate(issue.resolved_at)}
                        </p>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {issue.customer_name && (
                  <>
                    <div>
                      <Label className="text-xs text-gray-500">ลูกค้า</Label>
                      <p className="font-semibold">{issue.customer_name}</p>
                    </div>
                    <Separator />
                  </>
                )}

                {issue.reference_id && (
                  <div>
                    <Label className="text-xs text-gray-500">เลขที่อ้างอิง</Label>
                    <p className="font-semibold">{issue.reference_id}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default IssueDetailPage;