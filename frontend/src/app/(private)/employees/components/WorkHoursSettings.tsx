"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Clock, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://backend-service-production-1fc3.up.railway.app";

const WorkHoursSettings = () => {
  const { data: session } = useSession();
  const isManager = (session?.user as any)?.role === "adm";

  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isManager) return;
    const token = (session?.user as any)?.accessToken;
    fetch(`${API_URL}/work-hours/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        setStartTime(`${pad(data.start_hour)}:${pad(data.start_minute)}`);
        setEndTime(`${pad(data.end_hour)}:${pad(data.end_minute)}`);
        setIsEnabled(data.is_enabled);
      })
      .finally(() => setLoading(false));
  }, [isManager, session]);

  const handleSave = async () => {
    setSaving(true);
    const token = (session?.user as any)?.accessToken;
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    try {
      const res = await fetch(`${API_URL}/work-hours/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ start_hour: startHour, start_minute: startMinute, end_hour: endHour, end_minute: endMinute, is_enabled: isEnabled }),
      });
      if (res.ok) toast.success("บันทึกเวลาทำงานเรียบร้อยแล้ว");
      else toast.error("เกิดข้อผิดพลาด");
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    }
    setSaving(false);
  };

  if (!isManager || loading) return null;

  return (
    <div className="mt-4 p-4 border rounded-xl bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-orange-500" />
          <h3 className="font-semibold text-slate-800 text-sm">เวลาทำงานพนักงาน</h3>
        </div>
        <button onClick={() => setIsEnabled(!isEnabled)} className="flex items-center gap-2 text-sm">
          {isEnabled
            ? <><ToggleRight size={26} className="text-green-500" /><span className="text-green-600 font-medium text-xs">เปิดใช้งาน</span></>
            : <><ToggleLeft size={26} className="text-slate-400" /><span className="text-slate-500 text-xs">ปิด</span></>}
        </button>
      </div>

      {isEnabled && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">เริ่ม</span>
            <input
              type="time"
              lang="en-GB"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-white"
            />
          </div>
          <span className="text-slate-400">—</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">เลิก</span>
            <input
              type="time"
              lang="en-GB"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-white"
            />
          </div>
          <p className="text-xs text-slate-400 w-full">
            พนักงาน login ได้เฉพาะ {startTime} — {endTime} น.
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1">
          <Save size={13} />
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
};

export default WorkHoursSettings;