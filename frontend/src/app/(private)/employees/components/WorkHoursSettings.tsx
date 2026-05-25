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

  const [startHour, setStartHour] = useState(8);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(18);
  const [endMinute, setEndMinute] = useState(0);
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
        setStartHour(data.start_hour);
        setStartMinute(data.start_minute);
        setEndHour(data.end_hour);
        setEndMinute(data.end_minute);
        setIsEnabled(data.is_enabled);
      })
      .finally(() => setLoading(false));
  }, [isManager, session]);

  const handleSave = async () => {
    setSaving(true);
    const token = (session?.user as any)?.accessToken;
    try {
      const res = await fetch(`${API_URL}/work-hours/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_hour: startHour,
          start_minute: startMinute,
          end_hour: endHour,
          end_minute: endMinute,
          is_enabled: isEnabled,
        }),
      });
      if (res.ok) toast.success("บันทึกเวลาทำงานเรียบร้อยแล้ว");
      else toast.error("เกิดข้อผิดพลาด");
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อได้");
    }
    setSaving(false);
  };

  if (!isManager || loading) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  const TimeInput = ({
    hour, setHour, minute, setMinute
  }: {
    hour: number; setHour: (v: number) => void;
    minute: number; setMinute: (v: number) => void;
  }) => (
    <div className="flex items-center gap-1">
      <select
        value={hour}
        onChange={(e) => setHour(Number(e.target.value))}
        className="border rounded px-2 py-1 text-sm bg-white"
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{pad(i)}</option>
        ))}
      </select>
      <span className="text-slate-400">:</span>
      <input
        type="number"
        min={0}
        max={59}
        value={minute}
        onChange={(e) => {
          const v = Math.max(0, Math.min(59, Number(e.target.value)));
          setMinute(v);
        }}
        className="border rounded px-2 py-1 text-sm bg-white w-14 text-center"
      />
    </div>
  );

  return (
    <div className="mt-6 p-4 border rounded-xl bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-orange-500" />
          <h3 className="font-semibold text-slate-800">เวลาทำงานพนักงาน</h3>
        </div>
        <button onClick={() => setIsEnabled(!isEnabled)} className="flex items-center gap-2 text-sm">
          {isEnabled ? (
            <><ToggleRight size={28} className="text-green-500" /><span className="text-green-600 font-medium">เปิดใช้งาน</span></>
          ) : (
            <><ToggleLeft size={28} className="text-slate-400" /><span className="text-slate-500">ปิด (ไม่จำกัดเวลา)</span></>
          )}
        </button>
      </div>

      {isEnabled && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">เริ่มงาน</span>
            <TimeInput hour={startHour} setHour={setStartHour} minute={startMinute} setMinute={setStartMinute} />
          </div>
          <span className="text-slate-400">—</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">เลิกงาน</span>
            <TimeInput hour={endHour} setHour={setEndHour} minute={endMinute} setMinute={setEndMinute} />
          </div>
          <p className="text-xs text-slate-500 w-full">
            พนักงานจะ login ได้เฉพาะ {pad(startHour)}:{pad(startMinute)} — {pad(endHour)}:{pad(endMinute)} น.
          </p>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          <Save size={14} />
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
};

export default WorkHoursSettings;