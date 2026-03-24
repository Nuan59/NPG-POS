"use client";

import { useEffect, useState } from "react";
import { X, Clock, ArrowRight, User, Save, History, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DOC_STATUS_LABEL, DOC_STATUS_COLOR,
  DocStatus, RegistrationItem, StatusLogEntry,
  getStatusHistory, updateDocStatus,
} from "@/services/Registrationservice";

interface StatusDialogProps {
  item: RegistrationItem;
  token: string;
  onClose: () => void;
  onUpdated: (id: number, newStatus: DocStatus, newNotes: string) => void;
}

const STATUS_OPTIONS = [
  { value: "pending"   as DocStatus, label: "รอเอกสาร",         bg: "bg-gray-50",   border: "border-gray-300",   text: "text-gray-700",   activeBg: "bg-gray-200 border-gray-500",    dot: "bg-gray-400"   },
  { value: "received"  as DocStatus, label: "รับเอกสารแล้ว",     bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-700",   activeBg: "bg-blue-200 border-blue-600",    dot: "bg-blue-500"   },
  { value: "fixing"    as DocStatus, label: "แก้เอกสาร",         bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", activeBg: "bg-yellow-200 border-yellow-600", dot: "bg-yellow-500" },
  { value: "completed" as DocStatus, label: "ลูกค้ารับเล่มแล้ว", bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700",  activeBg: "bg-green-200 border-green-600",  dot: "bg-green-500"  },
];

function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap", DOC_STATUS_COLOR[status])}>
      {DOC_STATUS_LABEL[status]}
    </span>
  );
}

export default function StatusDialog({ item, token, onClose, onUpdated }: StatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<DocStatus>(item.doc_status);
  const [notes, setNotes] = useState<string>(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<StatusLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingLogs(true);
      try {
        const data = await getStatusHistory(token, item.id);
        setLogs(data);
        if (data.length > 0) setShowHistory(true);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingLogs(false);
      }
    })();
  }, [item.id, token]);

  const hasChanged = selectedStatus !== item.doc_status || notes !== (item.notes ?? "");

  const handleSave = async () => {
    if (!hasChanged) { onClose(); return; }
    setSaving(true);
    try {
      await updateDocStatus(token, item.id, selectedStatus, notes);
      onUpdated(item.id, selectedStatus, notes);
      onClose();
    } catch {
      alert("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("th-TH", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">จัดการสถานะทะเบียน</h3>
            <p className="text-sm font-medium text-gray-500 mt-0.5">
              {item.customer_name} — {item.bikes[0]?.model_name ?? ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[75vh] overflow-y-auto">

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xs font-bold text-blue-600">สถานะปัจจุบัน</span>
            <StatusBadge status={item.doc_status} />
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">เลือกสถานะ</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = selectedStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedStatus(opt.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all",
                      isActive
                        ? `${opt.activeBg} ${opt.text} shadow-sm`
                        : `${opt.bg} ${opt.border} ${opt.text} hover:opacity-80`
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", opt.dot)} />
                    {opt.label}
                    {isActive && <span className="ml-auto text-xs font-bold opacity-70">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">หมายเหตุ</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เพิ่มหมายเหตุ (ถ้ามี)..."
              rows={3}
              className="w-full text-sm font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-gray-400"
            />
          </div>

          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-between w-full text-xs font-bold text-gray-500 uppercase tracking-wide hover:text-gray-800 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                ประวัติการเปลี่ยนสถานะ
                {!loadingLogs && (
                  <span className="bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                    {logs.length}
                  </span>
                )}
              </span>
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showHistory && (
              <div className="mt-2 space-y-2">
                {loadingLogs ? (
                  <div className="text-center py-4">
                    <Clock className="h-6 w-6 text-gray-300 mx-auto mb-1 animate-pulse" />
                    <p className="text-xs text-gray-400">กำลังโหลด...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <Clock className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">ยังไม่มีประวัติ</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 mt-2">ประวัติ ({logs.length} รายการ)</p>
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={log.from_status} />
                            <ArrowRight className="h-3 w-3 text-gray-400 shrink-0" />
                            <StatusBadge status={log.to_status} />
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />{fmt(log.changed_at)}
                            </p>
                            {log.changed_by && log.changed_by !== '-' && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <User className="h-3 w-3" />{log.changed_by}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanged}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all",
              hasChanged && !saving
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {saving ? (
              <><Clock className="h-4 w-4 animate-spin" /> กำลังบันทึก...</>
            ) : (
              <><Save className="h-4 w-4" /> บันทึก</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}