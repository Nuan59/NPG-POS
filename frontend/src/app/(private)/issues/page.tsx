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
import { Plus, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

const IssuesPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
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