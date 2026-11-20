"use client";

import { useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import { Loader2, Package, Search, X } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PickedPart {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: string | number;
  qty: string | number;
}

/**
 * ✅ เลือกอะไหล่จากสต็อก (ใช้ในงานซ่อม / ขายอะไหล่) - ของหมดกดไม่ได้
 */
export default function PartPickerDialog({ onPick, onClose }: { onPick: (p: PickedPart) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PickedPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const session = await getSession();
        const token = (session as any)?.user?.accessToken;
        const res = await fetch(`${API_BASE_URL}/parts/?q=${encodeURIComponent(q)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`โหลดรายการอะไหล่ไม่สำเร็จ (${res.status})`);
        setRows(await res.json());
        setError("");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/50 p-3 pt-[10vh]" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-[#1e2432] px-4 py-3 text-white">
          <p className="flex items-center gap-2 font-semibold"><Package size={18} /> เลือกอะไหล่จากสต็อก</p>
          <button onClick={onClose} aria-label="ปิด" className="rounded-full p-1 hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อ รหัส หรือรุ่นรถ"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-orange-500"
            />
          </div>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto border-t border-slate-100">
          {loading && <li className="flex justify-center py-8 text-slate-400"><Loader2 className="animate-spin" size={20} /></li>}
          {!loading && error && <li className="px-4 py-6 text-center text-sm text-red-600">{error}</li>}
          {!loading && !error && rows.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-slate-500">ไม่พบอะไหล่ (เพิ่มได้ที่เมนู อะไหล่)</li>
          )}
          {!loading && rows.map((p) => {
            const left = Number(p.qty) || 0;
            const out = left <= 0;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={out}
                  onClick={() => { onPick(p); onClose(); }}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1e2432]">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.code || "-"} · เหลือ {left.toLocaleString()} {p.unit}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${out ? "text-red-600" : "text-orange-600"}`}>
                    {out ? "หมด" : `฿${Number(p.price).toLocaleString()}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
