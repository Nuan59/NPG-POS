"use client";
// CashHandoverPanel.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/tasks/components/CashHandoverPanel.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Banknote, ChevronDown, Send, CheckCircle2, AlertTriangle, Clock, X, Pencil, Ban, Undo2, RotateCcw } from "lucide-react";
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
  status: "pending" | "received" | "mismatch" | "excluded";
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
        <Clock size={12} /> รอรับเงิน
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
 * - adm: แก้ได้ทุกอย่าง
 *   · ใบที่รอรับ: รับ / ยอดไม่ตรง / แก้ยอดรายการ / เอารายการออก / ยกเลิกใบ
 *   · ค้างส่ง (พนักงานยังไม่กดส่ง): รับเงินแทน / แก้ยอดเงินสด / ตัดออก (ไม่ต้องส่ง)
 *   · รับแล้ว: แก้ยอดที่รับ / ยกเลิกการรับ → รายรับในหน้า รายรับ-รายจ่าย แก้/ลบตามให้อัตโนมัติ
 *   · ตัดออกแล้ว: คืนรายการกลับไปค้างส่ง
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

  // ✅ adm แก้ยอดเงินสดของรายการที่ยังไม่ได้ส่ง (กรณีลูกค้าแบ่งจ่าย เงินสด + โอน แต่ตอนทำรายการเลือกเงินสดทั้งก้อน)
  const [cashEditFor, setCashEditFor] = useState<CashItem | null>(null);
  const [cashEditValue, setCashEditValue] = useState("");

  // ✅ adm: รายการที่ตัดออก / เลือกรายการค้างส่ง / dialog ต่างๆ
  const [excluded, setExcluded] = useState<Handover[]>([]);
  const [admSel, setAdmSel] = useState<Set<string>>(new Set()); // key = username|source-id
  const [directFor, setDirectFor] = useState<{ group: UnsentGroup; items: CashItem[] } | null>(null);
  const [directAmount, setDirectAmount] = useState("");
  const [directNote, setDirectNote] = useState("");
  const [excludeFor, setExcludeFor] = useState<{ group: UnsentGroup; items: CashItem[] } | null>(null);
  const [excludeNote, setExcludeNote] = useState("");
  const [itemEdit, setItemEdit] = useState<{ h: Handover; item: CashItem } | null>(null);
  const [itemEditValue, setItemEditValue] = useState("");
  const [recvEdit, setRecvEdit] = useState<Handover | null>(null);
  const [recvEditAmount, setRecvEditAmount] = useState("");
  const [recvEditNote, setRecvEditNote] = useState("");
  const [confirmAct, setConfirmAct] = useState<{ title: string; desc: string; label: string; run: () => Promise<void> } | null>(null);

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
        const [g, h, x] = await Promise.all([api("unsent/?all=1"), api("?limit=30"), api("?status=excluded&limit=30")]);
        setGroups(Array.isArray(g) ? g : []);
        setHandovers(Array.isArray(h) ? h : []);
        setExcluded(Array.isArray(x) ? x : []);
        setAdmSel(new Set());
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
      toast.success(`ส่งเงิน ${h.number} แล้ว รอรับเงิน`);
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

  // ✅ adm: เรียก action แล้วโหลดใหม่ (ใช้ร่วมกันทุกปุ่ม)
  const act = async (path: string, body: object, okMsg: string, after?: () => void) => {
    setBusy(true);
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      toast.success(okMsg);
      after?.();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const selKey = (g: UnsentGroup, i: CashItem) => `${g.username}|${keyOf(i)}`;
  const groupSelected = (g: UnsentGroup) => g.items.filter((i) => admSel.has(selKey(g, i)));
  const toggleAdm = (k: string) =>
    setAdmSel((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const toggleGroupAll = (g: UnsentGroup) =>
    setAdmSel((prev) => {
      const next = new Set(prev);
      const all = g.items.every((i) => next.has(selKey(g, i)));
      g.items.forEach((i) => (all ? next.delete(selKey(g, i)) : next.add(selKey(g, i))));
      return next;
    });
  const itemRef = (i: CashItem) => ({ source: i.source, source_id: i.source_id });

  if (status !== "authenticated") return null;

  const pending = handovers.filter((h) => h.status === "pending");
  const done = handovers.filter((h) => h.status !== "pending");

  // ✅ ไม่มีอะไรให้ทำ/ให้ดู → ไม่ต้องแสดงส่วนส่งเงินเลย
  const hasAnything = isAdmin
    ? pending.length > 0 || groups.length > 0 || done.length > 0 || excluded.length > 0
    : unsent.length > 0 || handovers.length > 0;
  if (loading || !hasAnything) return null;

  return (
    <section className="mb-8 space-y-4">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <Banknote className="h-5 w-5 text-orange-600" />
        ส่งเงินสด
      </h3>

      {/* ---------------- พนักงาน ---------------- */}
      {!isAdmin && (
        <>
          {unsent.length > 0 && (
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
              {unsent.map((item) => (
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
              ))}
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
          )}

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
          {pending.length > 0 && (
          <div className="bg-white rounded-xl border">
            <p className="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
              รอรับเงิน
              {pending.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">{pending.length}</span>
              )}
            </p>
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
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setConfirmAct({
                              title: `ยกเลิกใบ ${h.number}`,
                              desc: `${h.items.length} รายการ ${baht(h.total)} จะกลับไปเป็นค้างส่งของ ${h.created_by_name}`,
                              label: "ยกเลิกใบ",
                              run: () => act(`${h.id}/cancel/`, {}, `ยกเลิก ${h.number} แล้ว รายการกลับไปค้างส่ง`),
                            })
                          }
                        >
                          ยกเลิกใบ
                        </Button>
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
                      <div className="divide-y pl-5">
                        {h.items.map((i) => (
                          <div key={keyOf(i)} className="flex items-center gap-1">
                            <div className="flex-1 min-w-0">
                              <ItemRow item={i} />
                            </div>
                            <button
                              type="button"
                              aria-label="แก้ยอดรายการ"
                              title="แก้ยอดเงินสดของรายการนี้"
                              disabled={busy}
                              onClick={() => {
                                setItemEdit({ h, item: i });
                                setItemEditValue(String(i.amount));
                              }}
                              className="shrink-0 p-1.5 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              aria-label="เอาออกจากใบ"
                              title="เอาออกจากใบ (กลับไปค้างส่ง)"
                              disabled={busy}
                              onClick={() =>
                                setConfirmAct({
                                  title: "เอารายการออกจากใบ",
                                  desc: `${i.description} (${baht(i.amount)}) จะกลับไปเป็นค้างส่ง`,
                                  label: "เอาออก",
                                  run: () => act(`${h.id}/remove-item/`, itemRef(i), "เอารายการออกแล้ว"),
                                })
                              }
                              className="shrink-0 p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
          </div>
          )}

          {groups.length > 0 && (
          <div className="bg-white rounded-xl border">
            <p className="px-4 py-3 border-b text-sm font-medium">เงินสดที่พนักงานยังไม่ได้ส่ง</p>
              <div className="divide-y">
                {groups.map((g) => (
                  <details key={g.username} className="group px-4">
                    <summary className="flex items-center gap-3 py-3 cursor-pointer list-none">
                      <ChevronDown size={16} className="text-gray-400 transition-transform group-open:rotate-180" />
                      <span className="font-medium">{g.name}</span>
                      <span className="text-xs text-gray-400">{g.count} รายการ</span>
                      <span className="ml-auto font-semibold tabular-nums text-amber-700">{baht(g.total)}</span>
                    </summary>
                    <div className="pb-3 pl-7">
                      <label className="flex items-center gap-2 py-2 text-xs text-gray-500 cursor-pointer border-b">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-orange-600"
                          checked={g.items.length > 0 && g.items.every((i) => admSel.has(selKey(g, i)))}
                          onChange={() => toggleGroupAll(g)}
                        />
                        เลือกทั้งหมด
                      </label>
                      <div className="divide-y">
                        {g.items.map((i) => (
                          <div key={keyOf(i)} className="flex items-center gap-1">
                            <label className="flex flex-1 min-w-0 items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-orange-600 shrink-0"
                                checked={admSel.has(selKey(g, i))}
                                onChange={() => toggleAdm(selKey(g, i))}
                              />
                              <div className="flex-1 min-w-0">
                                <ItemRow item={i} />
                              </div>
                            </label>
                            {i.source !== "npg_fee" && (
                              <button
                                type="button"
                                aria-label="แก้ยอดเงินสด"
                                title="แก้ยอดเงินสด (ลูกค้าแบ่งจ่ายเงินสด + โอน)"
                                onClick={() => {
                                  setCashEditFor(i);
                                  setCashEditValue(String(i.amount));
                                }}
                                className="shrink-0 p-1.5 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {(() => {
                        const sel = groupSelected(g);
                        const total = sel.reduce((sum, i) => sum + i.amount, 0);
                        return (
                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                            <span className="text-sm text-gray-600 mr-auto">
                              เลือก {sel.length} รายการ ·{" "}
                              <span className="font-semibold text-gray-900 tabular-nums">{baht(total)}</span>
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy || sel.length === 0}
                              className="gap-1"
                              onClick={() => {
                                setExcludeFor({ group: g, items: sel });
                                setExcludeNote("");
                              }}
                            >
                              <Ban size={14} /> ตัดออก ไม่ต้องส่ง
                            </Button>
                            <Button
                              size="sm"
                              disabled={busy || sel.length === 0}
                              className="gap-1 bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setDirectFor({ group: g, items: sel });
                                setDirectAmount(String(total));
                                setDirectNote("");
                              }}
                            >
                              <CheckCircle2 size={15} /> รับเงินแทน
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  </details>
                ))}
              </div>
          </div>
          )}

          {done.length > 0 && (
            <div className="bg-white rounded-xl border">
              <p className="px-4 py-3 border-b text-sm font-medium">รับแล้วล่าสุด</p>
              <div className="divide-y">
                {done.slice(0, 10).map((h) => (
                  <details key={h.id} className="group px-4">
                    <summary className="flex flex-wrap items-center gap-3 py-2.5 text-sm cursor-pointer list-none">
                      <ChevronDown size={14} className="text-gray-400 transition-transform group-open:rotate-180" />
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
                    </summary>
                    <div className="pb-3 pl-6">
                      <div className="divide-y">{h.items.map((i) => <ItemRow key={keyOf(i)} item={i} />)}</div>
                      <p className="text-xs text-gray-500 mt-2">
                        {h.received_by} รับ {baht(h.received_amount ?? 0)}
                        {h.note && ` · ${h.note}`}
                        {h.received_note && ` · ${h.received_note}`}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          className="gap-1"
                          onClick={() => {
                            setRecvEdit(h);
                            setRecvEditAmount(String(h.received_amount ?? h.total));
                            setRecvEditNote(h.received_note || "");
                          }}
                        >
                          <Pencil size={14} /> แก้ยอดที่รับ
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setConfirmAct({
                              title: `ยกเลิกการรับ ${h.number}`,
                              desc: `ใบนี้จะกลับไปรอรับเงิน และลบรายรับ ${baht(h.received_amount ?? 0)} ในหน้ารายรับ-รายจ่ายออก`,
                              label: "ยกเลิกการรับ",
                              run: () => act(`${h.id}/unreceive/`, {}, `ยกเลิกการรับ ${h.number} แล้ว`),
                            })
                          }
                        >
                          <Undo2 size={14} /> ยกเลิกการรับ
                        </Button>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {excluded.length > 0 && (
            <div className="bg-white rounded-xl border">
              <p className="px-4 py-3 border-b text-sm font-medium">ตัดออกแล้ว (ไม่ต้องส่ง)</p>
              <div className="divide-y">
                {excluded.map((h) => (
                  <div key={h.id} className="px-4 py-2">
                    <div className="flex flex-wrap items-center gap-x-3 text-sm">
                      <span className="font-medium">{h.created_by_name}</span>
                      <span className="text-xs text-gray-400">
                        ตัดโดย {h.received_by} · {when(h.received_at)}
                        {h.received_note && ` · ${h.received_note}`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        className="ml-auto gap-1 text-gray-600"
                        onClick={() => act(`${h.id}/restore/`, {}, "คืนรายการแล้ว กลับไปค้างส่ง")}
                      >
                        <RotateCcw size={14} /> คืนรายการ
                      </Button>
                    </div>
                    <div className="divide-y pl-2">{h.items.map((i) => <ItemRow key={keyOf(i)} item={i} />)}</div>
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
            <DialogTitle>ส่งเงิน {baht(selectedTotal)}</DialogTitle>
            <DialogDescription>{selectedItems.length} รายการ · จะขึ้นสถานะรับแล้วเมื่อได้รับเงิน</DialogDescription>
          </DialogHeader>
          <div className="max-h-56 overflow-y-auto divide-y border rounded-lg px-3">
            {selectedItems.map((i) => <ItemRow key={keyOf(i)} item={i} />)}
          </div>
          <div>
            <label htmlFor="send-note" className="text-sm font-medium">หมายเหตุ (ถ้ามี)</label>
            <Textarea id="send-note" value={sendNote} onChange={(e) => setSendNote(e.target.value)} placeholder="เช่น ฝากไว้ในลิ้นชักโต๊ะ" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={busy}>ยกเลิก</Button>
            <Button onClick={submit} disabled={busy} className="gap-2 bg-orange-600 hover:bg-orange-700">
              <Send size={16} /> {busy ? "กำลังส่ง..." : "ยืนยันส่งเงิน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* adm: แก้ยอดเงินสดของรายการที่ยังไม่ได้ส่ง */}
      <Dialog open={!!cashEditFor} onOpenChange={(o) => !o && !busy && setCashEditFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ยอดเงินสด</DialogTitle>
            <DialogDescription>{cashEditFor?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="cash-edit" className="text-sm font-medium">ยอดที่ลูกค้าจ่ายเป็นเงินสด (฿)</label>
            <Input id="cash-edit" type="number" value={cashEditValue} onChange={(e) => setCashEditValue(e.target.value)} />
            <p className="text-xs text-gray-500">
              ส่วนที่เหลือถือเป็นเงินโอน ไม่ต้องส่ง · เว้นว่างแล้วบันทึก = กลับไปใช้ยอดเต็มตามรายการ
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashEditFor(null)} disabled={busy}>ยกเลิก</Button>
            <Button
              disabled={busy || (cashEditValue !== "" && Number(cashEditValue) < 0)}
              onClick={async () => {
                if (!cashEditFor) return;
                setBusy(true);
                try {
                  await api("set-cash-amount/", {
                    method: "POST",
                    body: JSON.stringify({
                      source: cashEditFor.source,
                      source_id: cashEditFor.source_id,
                      cash_amount: cashEditValue === "" ? null : Number(cashEditValue),
                    }),
                  });
                  toast.success("แก้ยอดเงินสดแล้ว");
                  setCashEditFor(null);
                  load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "แก้ยอดไม่สำเร็จ");
                } finally {
                  setBusy(false);
                }
              }}
            >
              บันทึก
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
      {/* adm: รับเงินแทน (พนักงานยังไม่ได้กดส่ง) */}
      <Dialog open={!!directFor} onOpenChange={(o) => !o && !busy && setDirectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รับเงินแทน {directFor?.group.name}</DialogTitle>
            <DialogDescription>
              {directFor?.items.length} รายการ · ยอดตามรายการ {baht(directFor?.items.reduce((sum, i) => sum + i.amount, 0) ?? 0)} ·
              ลงรายรับเงินสดให้อัตโนมัติ
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto divide-y border rounded-lg px-3">
            {directFor?.items.map((i) => <ItemRow key={keyOf(i)} item={i} />)}
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="direct-amount" className="text-sm font-medium">ยอดที่รับจริง (฿)</label>
              <Input id="direct-amount" type="number" value={directAmount} onChange={(e) => setDirectAmount(e.target.value)} />
            </div>
            <div>
              <label htmlFor="direct-note" className="text-sm font-medium">หมายเหตุ (ถ้ามี)</label>
              <Textarea id="direct-note" value={directNote} onChange={(e) => setDirectNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDirectFor(null)} disabled={busy}>ยกเลิก</Button>
            <Button
              disabled={busy || directAmount === "" || Number(directAmount) < 0}
              className="gap-1 bg-green-600 hover:bg-green-700"
              onClick={() =>
                directFor &&
                act(
                  "receive-direct/",
                  {
                    username: directFor.group.username,
                    items: directFor.items.map(itemRef),
                    received_amount: Number(directAmount),
                    note: directNote,
                  },
                  "รับเงินแล้ว ลงรายรับให้เรียบร้อย",
                  () => setDirectFor(null)
                )
              }
            >
              <CheckCircle2 size={15} /> ยืนยันรับเงิน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* adm: ตัดออก ไม่ต้องส่ง */}
      <Dialog open={!!excludeFor} onOpenChange={(o) => !o && !busy && setExcludeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ตัดออก ไม่ต้องส่ง</DialogTitle>
            <DialogDescription>
              {excludeFor?.items.length} รายการของ {excludeFor?.group.name} จะไม่ขึ้นค้างส่งและไม่ลงรายรับ · คืนรายการได้ภายหลัง
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-48 overflow-y-auto divide-y border rounded-lg px-3">
            {excludeFor?.items.map((i) => <ItemRow key={keyOf(i)} item={i} />)}
          </div>
          <div>
            <label htmlFor="exclude-note" className="text-sm font-medium">เหตุผล</label>
            <Textarea
              id="exclude-note"
              value={excludeNote}
              onChange={(e) => setExcludeNote(e.target.value)}
              placeholder="เช่น ลูกค้าโอนจริง เลือกประเภทผิด"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcludeFor(null)} disabled={busy}>ยกเลิก</Button>
            <Button
              disabled={busy}
              className="gap-1"
              onClick={() =>
                excludeFor &&
                act(
                  "exclude/",
                  { username: excludeFor.group.username, items: excludeFor.items.map(itemRef), note: excludeNote },
                  "ตัดรายการออกแล้ว",
                  () => setExcludeFor(null)
                )
              }
            >
              <Ban size={14} /> ยืนยันตัดออก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* adm: แก้ยอดรายการในใบที่รอรับ */}
      <Dialog open={!!itemEdit} onOpenChange={(o) => !o && !busy && setItemEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ยอดรายการใน {itemEdit?.h.number}</DialogTitle>
            <DialogDescription>{itemEdit?.item.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="item-edit" className="text-sm font-medium">ยอดเงินสด (฿)</label>
            <Input id="item-edit" type="number" value={itemEditValue} onChange={(e) => setItemEditValue(e.target.value)} />
            <p className="text-xs text-gray-500">ยอดรวมของใบจะคำนวณใหม่ให้</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemEdit(null)} disabled={busy}>ยกเลิก</Button>
            <Button
              disabled={busy || itemEditValue === "" || Number(itemEditValue) < 0}
              onClick={() =>
                itemEdit &&
                act(
                  `${itemEdit.h.id}/edit-item/`,
                  { ...itemRef(itemEdit.item), amount: Number(itemEditValue) },
                  "แก้ยอดรายการแล้ว",
                  () => setItemEdit(null)
                )
              }
            >
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* adm: แก้ยอดที่รับแล้ว */}
      <Dialog open={!!recvEdit} onOpenChange={(o) => !o && !busy && setRecvEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ยอดที่รับ {recvEdit?.number}</DialogTitle>
            <DialogDescription>
              ยอดตามใบ {baht(recvEdit?.total ?? 0)} · รายรับในหน้ารายรับ-รายจ่ายจะแก้ตามให้
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="recv-edit-amount" className="text-sm font-medium">ยอดที่รับจริง (฿)</label>
              <Input id="recv-edit-amount" type="number" value={recvEditAmount} onChange={(e) => setRecvEditAmount(e.target.value)} />
              {recvEdit && recvEditAmount !== "" && Number(recvEditAmount) !== recvEdit.total && (
                <p className="text-xs mt-1 text-red-600">ส่วนต่าง {baht(Number(recvEditAmount) - recvEdit.total)}</p>
              )}
            </div>
            <div>
              <label htmlFor="recv-edit-note" className="text-sm font-medium">หมายเหตุ</label>
              <Textarea id="recv-edit-note" value={recvEditNote} onChange={(e) => setRecvEditNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecvEdit(null)} disabled={busy}>ยกเลิก</Button>
            <Button
              disabled={busy || recvEditAmount === "" || Number(recvEditAmount) < 0}
              onClick={() =>
                recvEdit &&
                act(
                  `${recvEdit.id}/edit-received/`,
                  { received_amount: Number(recvEditAmount), note: recvEditNote },
                  `แก้ยอด ${recvEdit.number} แล้ว`,
                  () => setRecvEdit(null)
                )
              }
            >
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* adm: ยืนยันก่อนทำรายการที่ย้อนกลับ */}
      <Dialog open={!!confirmAct} onOpenChange={(o) => !o && !busy && setConfirmAct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAct?.title}</DialogTitle>
            <DialogDescription>{confirmAct?.desc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAct(null)} disabled={busy}>ไม่ใช่</Button>
            <Button
              disabled={busy}
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!confirmAct) return;
                await confirmAct.run();
                setConfirmAct(null);
              }}
            >
              {confirmAct?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}