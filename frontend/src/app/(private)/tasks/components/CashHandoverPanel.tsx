"use client";
// CashHandoverPanel.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/tasks/components/CashHandoverPanel.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Banknote, ChevronDown, Send, CheckCircle2, AlertTriangle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CashItem {
  source: "sale" | "service" | "npg_payment" | "npg_fee";
  source_id: number;
  amount: number;
  description: string;
  record_date: string | null;
  username?: string;
}

interface Handover {
  id: number;
  number: string;
  created_by_name: string;
  total: number;
  note: string;
  status: "pending" | "received" | "mismatch";
  received_amount: number | null;
  received_by: string;
  received_at: string | null;
  received_note: string;
  created_at: string;
  items: CashItem[];
}

interface UnsentGroup {
  username: string;
  name: string;
  count: number;
  total: number;
  items: CashItem[];
}

const baht = (n: number) => `฿${Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "-";
const keyOf = (i: CashItem) => `${i.source}-${i.source_id}`;

const SOURCE_LABEL: Record<CashItem["source"], { label: string; cls: string }> = {
  sale: { label: "ขาย", cls: "bg-blue-50 text-blue-700" },
  service: { label: "บริการ", cls: "bg-orange-50 text-orange-700" },
  npg_payment: { label: "ค่างวด", cls: "bg-purple-50 text-purple-700" },
  npg_fee: { label: "ค่าธรรมเนียม", cls: "bg-cyan-50 text-cyan-700" },
};

const StatusChip = ({ h }: { h: Handover }) => {
  if (h.status === "pending")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
        <Clock size={12} /> รอ adm รับ
      </span>
    );
  if (h.status === "mismatch")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <AlertTriangle size={12} /> รับแล้ว ยอดไม่ตรง
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      <CheckCircle2 size={12} /> รับแล้ว
    </span>
  );
};

const ItemRow = ({ item }: { item: CashItem }) => {
  const src = SOURCE_LABEL[item.source];
  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <span className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded ${src.cls}`}>{src.label}</span>
      <span className="flex-1 min-w-0 truncate text-gray-700">{item.description}</span>
      <span className="shrink-0 text-xs text-gray-400">{when(item.record_date)}</span>
      <span className="shrink-0 w-24 text-right font-medium tabular-nums">{baht(item.amount)}</span>
    </div>
  );
};

/**
 * ส่งเงินสดให้ adm
 * - พนักงาน: เห็นเงินสดค้างส่งของตัวเอง เลือกรายการแล้วกดส่ง + ประวัติใบส่งเงิน
 * - adm: ใบส่งเงินที่รอรับ (กดรับ / ยอดไม่ตรง) + ภาพรวมค้างส่งของพนักงานแต่ละคน
 */
export default function CashHandoverPanel() {
  const { data: session, status } = useSession();
  const token = (session as any)?.user?.accessToken;
  const isAdmin = String((session as any)?.user?.role ?? "").toLowerCase() === "adm";

  const [unsent, setUnsent] = useState<CashItem[]>([]);
  const [groups, setGroups] = useState<UnsentGroup[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendNote, setSendNote] = useState("");
  const [busy, setBusy] = useState(false);

  const [mismatchFor, setMismatchFor] = useState<Handover | null>(null);
  const [mismatchAmount, setMismatchAmount] = useState("");
  const [mismatchNote, setMismatchNote] = useState("");

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${API_BASE_URL}/cash-handover/${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`);
      return data;
    },
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (isAdmin) {
        const [g, h] = await Promise.all([api("unsent/?all=1"), api("?limit=30")]);
        setGroups(Array.isArray(g) ? g : []);
        setHandovers(Array.isArray(h) ? h : []);
      } else {
        const [u, h] = await Promise.all([api("unsent/"), api("?limit=10")]);
        setUnsent(Array.isArray(u) ? u : []);
        setHandovers(Array.isArray(h) ? h : []);
        setSelected(new Set());
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "โหลดข้อมูลส่งเงินไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [api, token, isAdmin]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const selectedItems = useMemo(() => unsent.filter((i) => selected.has(keyOf(i))), [unsent, selected]);
  const selectedTotal = selectedItems.reduce((s, i) => s + i.amount, 0);
  const unsentTotal = unsent.reduce((s, i) => s + i.amount, 0);
  const allChecked = unsent.length > 0 && selected.size === unsent.length;

  const toggle = (k: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const submit = async () => {
    setBusy(true);
    try {
      const h = await api("submit/", {
        method: "POST",
        body: JSON.stringify({
          items: selectedItems.map((i) => ({ source: i.source, source_id: i.source_id })),
          note: sendNote,
        }),
      });
      toast.success(`ส่งเงิน ${h.number} แล้ว รอ adm กดรับ`);
      setSendOpen(false);
      setSendNote("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งเงินไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (h: Handover) => {
    try {
      await api(`${h.id}/cancel/`, { method: "POST" });
      toast.success(`ยกเลิก ${h.number} แล้ว รายการกลับไปค้างส่ง`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ");
    }
  };

  const receive = async (h: Handover, amount?: number, note?: string) => {
    setBusy(true);
    try {
      const res = await api(`${h.id}/receive/`, {
        method: "POST",
        body: JSON.stringify(amount === undefined ? {} : { received_amount: amount, note }),
      });
      toast.success(
        res.status === "mismatch"
          ? `รับ ${h.number} แล้ว (ยอดไม่ตรง ${baht(res.received_amount - res.total)})`
          : `รับเงิน ${h.number} แล้ว ลงรายรับให้เรียบร้อย`
      );
      setMismatchFor(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "รับเงินไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  if (status !== "authenticated") return null;

  const pending = handovers.filter((h) => h.status === "pending");
  const done = handovers.filter((h) => h.status !== "pending");

  return (
    <section className="mb-8 space-y-4">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <Banknote className="h-5 w-5 text-orange-600" />
        ส่งเงินสด
      </h3>

      {/* ---------------- พนักงาน ---------------- */}
      {!isAdmin && (
        <>
          <div className="bg-white rounded-xl border">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  id="cash-select-all"
                  type="checkbox"
                  className="h-4 w-4 accent-orange-600"
                  checked={allChecked}
                  disabled={unsent.length === 0}
                  onChange={() => setSelected(allChecked ? new Set() : new Set(unsent.map(keyOf)))}
                />
                เงินสดค้างส่ง {unsent.length > 0 && `(${unsent.length} รายการ)`}
              </label>
              <span className="text-sm text-gray-500">
                รวม <span className="font-semibold text-gray-900 tabular-nums">{baht(unsentTotal)}</span>
              </span>
            </div>

            <div className="px-4 divide-y max-h-80 overflow-y-auto">
              {loading ? (
                <p className="py-6 text-center text-sm text-gray-400">กำลังโหลด...</p>
              ) : unsent.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">ไม่มีเงินสดค้างส่ง</p>
              ) : (
                unsent.map((item) => (
                  <label key={keyOf(item)} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-orange-600 shrink-0"
                      checked={selected.has(keyOf(item))}
                      onChange={() => toggle(keyOf(item))}
                    />
                    <div className="flex-1 min-w-0">
                      <ItemRow item={item} />
                    </div>
                  </label>
                ))
              )}
            </div>

            {unsent.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-gray-50 rounded-b-xl">
                <span className="text-sm text-gray-600">
                  เลือก {selectedItems.length} รายการ ·{" "}
                  <span className="font-semibold text-gray-900 tabular-nums">{baht(selectedTotal)}</span>
                </span>
                <Button
                  disabled={selectedItems.length === 0}
                  onClick={() => setSendOpen(true)}
                  className="gap-2 bg-orange-600 hover:bg-orange-700"
                >
                  <Send size={16} /> ส่งเงิน
                </Button>
              </div>
            )}
          </div>

          {handovers.length > 0 && (
            <div className="bg-white rounded-xl border">
              <p className="px-4 py-3 border-b text-sm font-medium">ใบส่งเงินของฉัน</p>
              <div className="divide-y">
                {handovers.map((h) => (
                  <details key={h.id} className="group px-4">
                    <summary className="flex items-center gap-3 py-3 cursor-pointer list-none">
                      <ChevronDown size={16} className="text-gray-400 transition-transform group-open:rotate-180" />
                      <span className="text-sm font-medium">{h.number}</span>
                      <span className="text-xs text-gray-400">{when(h.created_at)}</span>
                      <StatusChip h={h} />
                      <span className="ml-auto font-semibold tabular-nums">{baht(h.total)}</span>
                    </summary>
                    <div className="pb-3 pl-7">
                      <div className="divide-y">{h.items.map((i) => <ItemRow key={keyOf(i)} item={i} />)}</div>
                      {h.status !== "pending" && (
                        <p className="text-xs text-gray-500 mt-2">
                          {h.received_by} รับ {baht(h.received_amount ?? 0)} เมื่อ {when(h.received_at)}
                          {h.received_note && ` · ${h.received_note}`}
                        </p>
                      )}
                      {h.status === "pending" && (
                        <Button variant="outline" size="sm" className="mt-2 gap-1 text-red-600" onClick={() => cancel(h)}>
                          <X size={14} /> ยกเลิกใบส่งเงิน
                        </Button>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------------- adm ---------------- */}
      {isAdmin && (
        <>
          <div className="bg-white rounded-xl border">
            <p className="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
              รอรับเงิน
              {pending.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">{pending.length}</span>
              )}
            </p>
            {loading ? (
              <p className="py-6 text-center text-sm text-gray-400">กำลังโหลด...</p>
            ) : pending.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">ไม่มีใบส่งเงินที่รอรับ</p>
            ) : (
              <div className="divide-y">
                {pending.map((h) => (
                  <div key={h.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {h.created_by_name} <span className="text-gray-400 font-normal text-sm">· {h.number}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          ส่งเมื่อ {when(h.created_at)} · {h.items.length} รายการ
                          {h.note && ` · ${h.note}`}
                        </p>
                      </div>
                      <span className="ml-auto text-lg font-bold tabular-nums">{baht(h.total)}</span>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setMismatchFor(h);
                            setMismatchAmount(String(h.total));
                            setMismatchNote("");
                          }}
                        >
                          ยอดไม่ตรง
                        </Button>
                        <Button size="sm" disabled={busy} onClick={() => receive(h)} className="gap-1 bg-green-600 hover:bg-green-700">
                          <CheckCircle2 size={15} /> รับเงิน
                        </Button>
                      </div>
                    </div>
                    <details className="group mt-1">
                      <summary className="text-xs text-gray-500 cursor-pointer list-none flex items-center gap-1">
                        <ChevronDown size={14} className="transition-transform group-open:rotate-180" /> ดูรายการ
                      </summary>
                      <div className="divide-y pl-5">{h.items.map((i) => <ItemRow key={keyOf(i)} item={i} />)}</div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border">
            <p className="px-4 py-3 border-b text-sm font-medium">เงินสดที่พนักงานยังไม่ได้ส่ง</p>
            {groups.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">ทุกคนส่งเงินครบแล้ว</p>
            ) : (
              <div className="divide-y">
                {groups.map((g) => (
                  <details key={g.username} className="group px-4">
                    <summary className="flex items-center gap-3 py-3 cursor-pointer list-none">
                      <ChevronDown size={16} className="text-gray-400 transition-transform group-open:rotate-180" />
                      <span className="font-medium">{g.name}</span>
                      <span className="text-xs text-gray-400">{g.count} รายการ</span>
                      <span className="ml-auto font-semibold tabular-nums text-amber-700">{baht(g.total)}</span>
                    </summary>
                    <div className="divide-y pb-3 pl-7">{g.items.map((i) => <ItemRow key={keyOf(i)} item={i} />)}</div>
                  </details>
                ))}
              </div>
            )}
          </div>

          {done.length > 0 && (
            <div className="bg-white rounded-xl border">
              <p className="px-4 py-3 border-b text-sm font-medium">รับแล้วล่าสุด</p>
              <div className="divide-y">
                {done.slice(0, 10).map((h) => (
                  <div key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="font-medium">{h.created_by_name}</span>
                    <span className="text-xs text-gray-400">
                      {h.number} · รับ {when(h.received_at)}
                    </span>
                    <StatusChip h={h} />
                    <span className="ml-auto tabular-nums">
                      {h.status === "mismatch" ? (
                        <>
                          <span className="line-through text-gray-400 mr-2">{baht(h.total)}</span>
                          <span className="font-semibold text-red-600">{baht(h.received_amount ?? 0)}</span>
                        </>
                      ) : (
                        <span className="font-semibold">{baht(h.total)}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ยืนยันส่งเงิน */}
      <Dialog open={sendOpen} onOpenChange={(o) => !busy && setSendOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ส่งเงินให้ adm {baht(selectedTotal)}</DialogTitle>
            <DialogDescription>{selectedItems.length} รายการ · adm จะกดรับเมื่อได้เงินแล้ว</DialogDescription>
          </DialogHeader>
          <div className="max-h-56 overflow-y-auto divide-y border rounded-lg px-3">
            {selectedItems.map((i) => <ItemRow key={keyOf(i)} item={i} />)}
          </div>
          <div>
            <label htmlFor="send-note" className="text-sm font-medium">หมายเหตุ (ถ้ามี)</label>
            <Textarea id="send-note" value={sendNote} onChange={(e) => setSendNote(e.target.value)} placeholder="เช่น ฝากไว้ในลิ้นชักโต๊ะ adm" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={busy}>ยกเลิก</Button>
            <Button onClick={submit} disabled={busy} className="gap-2 bg-orange-600 hover:bg-orange-700">
              <Send size={16} /> {busy ? "กำลังส่ง..." : "ยืนยันส่งเงิน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* adm: ยอดไม่ตรง */}
      <Dialog open={!!mismatchFor} onOpenChange={(o) => !o && !busy && setMismatchFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รับเงิน {mismatchFor?.number} แบบยอดไม่ตรง</DialogTitle>
            <DialogDescription>
              {mismatchFor?.created_by_name} แจ้งส่ง {baht(mismatchFor?.total ?? 0)} · กรอกยอดที่ได้รับจริง
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="mismatch-amount" className="text-sm font-medium">ยอดที่รับจริง (฿)</label>
              <Input id="mismatch-amount" type="number" value={mismatchAmount} onChange={(e) => setMismatchAmount(e.target.value)} />
              {mismatchFor && mismatchAmount !== "" && (
                <p className="text-xs mt-1 text-red-600">
                  ส่วนต่าง {baht(Number(mismatchAmount) - mismatchFor.total)}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="mismatch-note" className="text-sm font-medium">หมายเหตุ</label>
              <Textarea id="mismatch-note" value={mismatchNote} onChange={(e) => setMismatchNote(e.target.value)} placeholder="เช่น ขาดไป 100 บาท พนักงานจะนำมาให้พรุ่งนี้" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMismatchFor(null)} disabled={busy}>ยกเลิก</Button>
            <Button
              disabled={busy || mismatchAmount === "" || Number(mismatchAmount) < 0}
              onClick={() => mismatchFor && receive(mismatchFor, Number(mismatchAmount), mismatchNote)}
            >
              บันทึกการรับเงิน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}