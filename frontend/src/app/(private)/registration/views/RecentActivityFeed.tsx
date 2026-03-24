"use client";

import { useEffect, useState } from "react";
import { Clock, ArrowRight, ChevronRight, ExternalLink, User, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DOC_STATUS_LABEL, DOC_STATUS_COLOR,
  DocStatus, ActivityLogEntry,
  getActivityFeed,
} from "@/services/Registrationservice";

interface RecentActivityFeedProps {
  token: string;
  onViewAll: () => void;
  onOrderClick?: (orderId: number) => void;
}

const STATUS_DOT: Record<DocStatus, string> = {
  pending:   "bg-gray-400",
  received:  "bg-blue-400",
  fixing:    "bg-yellow-400",
  completed: "bg-green-500",
};

function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap", DOC_STATUS_COLOR[status])}>
      {DOC_STATUS_LABEL[status]}
    </span>
  );
}

function formatRelative(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000); // นาที
  if (diff < 1)  return "เมื่อกี้";
  if (diff < 60) return `${diff} นาทีที่แล้ว`;
  const h = Math.floor(diff / 60);
  if (h < 24)   return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function RecentActivityFeed({ token, onViewAll, onOrderClick }: RecentActivityFeedProps) {
  const [logs, setLogs]       = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getActivityFeed(token, 20);
      setLogs(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
        <h2 className="font-bold text-gray-700 flex items-center gap-1.5 text-xs uppercase tracking-wide">
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          การเปลี่ยนแปลงล่าสุด
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={load} className="text-gray-400 hover:text-gray-700 transition-colors" title="รีเฟรช">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={onViewAll} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 transition-colors">
            ดูทั้งหมด <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Feed — scrollable max-h-72 */}
      <div className="overflow-y-auto max-h-72 divide-y divide-gray-50">
        {loading ? (
          <div className="py-8 text-center">
            <Clock className="h-5 w-5 text-gray-300 mx-auto mb-1.5 animate-pulse" />
            <p className="text-xs text-gray-400">กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-red-400">โหลดไม่สำเร็จ</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">ยังไม่มีการเปลี่ยนแปลง</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.log_id}
              onClick={() => onOrderClick?.(log.order_id)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 border-l-[3px] transition-colors",
                onOrderClick ? "cursor-pointer hover:bg-gray-50 group" : "",
                // สีตาม to_status
                log.to_status === "pending"   && "border-l-gray-300",
                log.to_status === "received"  && "border-l-blue-300",
                log.to_status === "fixing"    && "border-l-yellow-400",
                log.to_status === "completed" && "border-l-green-400",
              )}
            >
              {/* dot */}
              <span className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[log.to_status])} />

              {/* content */}
              <div className="flex-1 min-w-0">
                {/* row 1: ชื่อลูกค้า · รุ่นรถ */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-xs text-gray-900 truncate">{log.customer_name}</span>
                  <span className="text-gray-300 text-xs shrink-0">·</span>
                  <span className="text-xs text-gray-500 truncate">
                    {log.bike_model}
                    {log.bike_color && <span className="text-gray-400"> ({log.bike_color})</span>}
                  </span>
                </div>

                {/* row 2: from → to badges */}
                <div className="flex items-center gap-1 mt-1">
                  <StatusBadge status={log.from_status} />
                  <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                  <StatusBadge status={log.to_status} />
                </div>

                {/* row 3: เวลา + คนที่เปลี่ยน */}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">{formatRelative(log.changed_at)}</span>
                  {log.changed_by && log.changed_by !== '-' && (
                    <span className="text-xs text-gray-400 flex items-center gap-0.5">
                      <User className="h-2.5 w-2.5" />{log.changed_by}
                    </span>
                  )}
                </div>
              </div>

              {/* arrow */}
              {onOrderClick && (
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}