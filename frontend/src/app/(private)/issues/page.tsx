"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertCircle, CheckCircle, Clock, Megaphone, Trash2, Eye, EyeOff, Pencil, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import {
  Announcement,
  getAnnouncements,
  toggleAnnouncement,
  deleteAnnouncement,
  getAnnouncementSettings,
  updateAnnouncementSpeed,
} from "@/services/AnnouncementService";
import AnnouncementDialog from "./components/AnnouncementDialog";

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
}

type TabKey = "open" | "closed";

// ✅ แผงจัดการ "ประกาศตัวหนังสือไหล" ใต้ Navbar - เฉพาะ admin เห็นและใช้งานได้
// สร้าง/แก้ไข ใช้ Dialog แบบเดียวกับ pattern อื่นในแอป (เช่น PermissionsDialog) แทน textarea แทรกในการ์ด
const AnnouncementPanel = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | undefined>(undefined);

  // ✅ ความเร็วตัวหนังสือไหล (ค่ารวม - ทุกประกาศไหลรวมเป็นแถบเดียว)
  const [speed, setSpeed] = useState<number>(40);
  const [speedSaving, setSpeedSaving] = useState(false);

  const loadAnnouncements = async () => {
    const data = await getAnnouncements();
    setAnnouncements(data);
    setLoading(false);
  };

  const loadSpeed = async () => {
    const settings = await getAnnouncementSettings();
    setSpeed(settings.speed_seconds);
  };

  useEffect(() => {
    loadAnnouncements();
    loadSpeed();
  }, []);

  const openCreateDialog = () => {
    setEditingAnnouncement(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (a: Announcement) => {
    setEditingAnnouncement(a);
    setDialogOpen(true);
  };

  const handleToggle = async (a: Announcement) => {
    const result = await toggleAnnouncement(a.id, !a.is_active);
    if (result.status === "success") {
      loadAnnouncements();
    } else {
      toast.error(result.error || "อัปเดตไม่สำเร็จ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("ต้องการลบประกาศนี้ใช่ไหม?")) return;
    const result = await deleteAnnouncement(id);
    if (result.status === "success") {
      toast.success("ลบแล้ว");
      loadAnnouncements();
    } else {
      toast.error(result.error || "ลบไม่สำเร็จ");
    }
  };

  const handleSaveSpeed = async () => {
    setSpeedSaving(true);
    const result = await updateAnnouncementSpeed(speed);
    setSpeedSaving(false);
    if (result.status === "success") {
      toast.success("ตั้งความเร็วแล้ว");
    } else {
      toast.error(result.error || "ตั้งความเร็วไม่สำเร็จ");
    }
  };

  return (
    <Card className="mb-6 border-orange-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="w-5 h-5 text-orange-600" />
            ประกาศตัวหนังสือไหล (แสดงใต้เมนูบนทุกหน้า)
          </CardTitle>
          <Button size="sm" onClick={openCreateDialog} className="gap-1">
            <Plus size={14} /> เพิ่มประกาศ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* ✅ ตั้งความเร็ว - เป็นค่ารวม เพราะทุกประกาศไหลรวมเป็นแถบเดียวกัน */}
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-gray-50 border">
          <Gauge size={16} className="text-gray-500 shrink-0" />
          <span className="text-xs text-gray-600 shrink-0">ความเร็วตัวหนังสือไหล (วินาที/รอบ ยิ่งน้อยยิ่งเร็ว)</span>
          <input
            type="number"
            min={5}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value) || 5)}
            className="w-20 text-sm border rounded px-2 py-1 outline-none focus:border-orange-400"
          />
          <Button size="sm" variant="outline" onClick={handleSaveSpeed} disabled={speedSaving}>
            {speedSaving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">กำลังโหลด...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีประกาศ</p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex items-start justify-between gap-2 p-2.5 rounded-lg border text-sm",
                  a.is_active ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200 opacity-60"
                )}
              >
                <div className="flex-1">
                  <p>{a.content}</p>
                  {a.detail && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{a.detail}</p>}
                </div>
                <button
                  onClick={() => openEditDialog(a)}
                  className="text-gray-500 hover:text-blue-600 shrink-0"
                  title="แก้ไข"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleToggle(a)}
                  className="text-gray-500 hover:text-orange-600 shrink-0"
                  title={a.is_active ? "ซ่อน" : "แสดง"}
                >
                  {a.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-gray-400 hover:text-rose-500 shrink-0"
                  title="ลบ"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AnnouncementDialog
        announcement={editingAnnouncement}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={loadAnnouncements}
      />
    </Card>
  );
};

const IssuesPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "adm";
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    fetchIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      // ✅ ดึงมาทั้งหมดครั้งเดียว แล้วแยกแท็บ/กรองในเครื่อง (เร็วกว่า ไม่ต้องยิง API ซ้ำตอนสลับแท็บ)
      const response = await fetch("/api/issues/");
      const data = await response.json();
      setIssues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching issues:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ แยกกระทู้ "เปิดอยู่" (open + in_progress) กับ "ปิดแล้ว" (resolved)
  const openIssues = useMemo(
    () => issues.filter((i) => i.status !== "resolved"),
    [issues]
  );
  const closedIssues = useMemo(
    () => issues.filter((i) => i.status === "resolved"),
    [issues]
  );

  const baseList = activeTab === "open" ? openIssues : closedIssues;

  const displayedIssues = useMemo(() => {
    if (priorityFilter === "all") return baseList;
    return baseList.filter((i) => i.priority === priorityFilter);
  }, [baseList, priorityFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCardClick = (issueId: number) => {
    router.push(`/issues/${issueId}`);
  };

  if (loading) {
    return <div className="p-6">กำลังโหลด...</div>;
  }

  return (
    <div className="p-6">
      {/* ✅ แผงจัดการประกาศตัวหนังสือไหล - เฉพาะ admin */}
      {isAdmin && <AnnouncementPanel />}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">กระทู้/แจ้งปัญหา</h1>
          <p className="text-gray-500">จัดการและติดตามปัญหาในระบบ</p>
        </div>
        <Link href="/issues/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            สร้างกระทู้ใหม่
          </Button>
        </Link>
      </div>

      {/* ✅ แท็บ เปิดอยู่ / ปิดแล้ว */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveTab("open")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "open"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          เปิดอยู่ ({openIssues.length})
        </button>
        <button
          onClick={() => setActiveTab("closed")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            activeTab === "closed"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          ปิดแล้ว ({closedIssues.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="กรองตามความสำคัญ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="urgent">เร่งด่วน</SelectItem>
            <SelectItem value="high">สูง</SelectItem>
            <SelectItem value="medium">กลาง</SelectItem>
            <SelectItem value="low">ต่ำ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Issues List */}
      <ScrollArea className="h-[calc(100vh-360px)]">
        <div className="space-y-4">
          {displayedIssues.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                {activeTab === "open" ? "ไม่มีกระทู้ที่เปิดอยู่" : "ไม่มีกระทู้ที่ปิดแล้ว"}
              </CardContent>
            </Card>
          ) : (
            displayedIssues.map((issue) => (
              <Card
                key={issue.id}
                className={cn(
                  "hover:shadow-lg transition-shadow cursor-pointer",
                  activeTab === "closed" && "opacity-80"
                )}
                onClick={() => handleCardClick(issue.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(issue.status)}
                        <CardTitle className="text-xl hover:text-blue-600">
                          {issue.title}
                        </CardTitle>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={getPriorityColor(issue.priority)}>
                          {issue.priority_display}
                        </Badge>
                        <Badge variant="outline">{issue.category_display}</Badge>
                        <Badge variant="secondary">{issue.status_display}</Badge>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 text-right">
                      <div>สร้างโดย: {issue.created_by.first_name || issue.created_by.username}</div>
                      <div>{formatDate(issue.created_at)}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4 line-clamp-2">
                    {issue.description}
                  </p>

                  <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                    {issue.customer_name && (
                      <div>
                        <span className="font-semibold">ลูกค้า:</span> {issue.customer_name}
                      </div>
                    )}
                    {issue.reference_id && (
                      <div>
                        <span className="font-semibold">อ้างอิง:</span> {issue.reference_id}
                      </div>
                    )}
                    {issue.assigned_to && (
                      <div>
                        <span className="font-semibold">มอบหมายให้:</span>{" "}
                        {issue.assigned_to.first_name || issue.assigned_to.username}
                      </div>
                    )}
                    {issue.resolved_by && (
                      <div>
                        <span className="font-semibold">แก้ไขโดย:</span>{" "}
                        {issue.resolved_by.first_name || issue.resolved_by.username}
                        {issue.resolved_at && ` (${formatDate(issue.resolved_at)})`}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default IssuesPage;