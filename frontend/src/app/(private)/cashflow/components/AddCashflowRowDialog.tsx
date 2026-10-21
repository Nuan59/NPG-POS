// AddCashflowRowDialog.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/AddCashflowRowDialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { RowType, TYPE_COLOR, TYPE_FIELDS, TYPE_LABEL, fmt } from "../util/cashflowUtil";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// รายการเงินสดค้างส่ง (จาก /cash-handover/unsent/)
interface UnsentItem {
  source: string;
  source_id: number;
  amount: number;
  description: string;
  record_date: string | null;
}
// ประวัติการส่ง (จาก /cash-handover/)
interface SendHistory {
  id: number;
  total: number;
  status: string;
  received_at: string | null;
  created_at: string;
  items: { description: string; amount: number }[];
}
const keyOf = (i: { source: string; source_id: number }) => `${i.source}:${i.source_id}`;
const timeTH = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

interface AddCashflowRowDialogProps {
  onClose: () => void;
  onAdd: (data: { description: string; type: RowType; amount: number }) => void;
  isAdmin?: boolean;
  /** ✅ ส่วนเงินสด: พนักงานเลือก "ส่งเงิน" ได้ - ติ๊กจากรายการค้างส่งของตัวเอง (พิมพ์ยอดเองไม่ได้) หักลิ้นชักทันที */
  allowHandover?: boolean;
  /** ส่งเงินสำเร็จ (backend ลงแถว "ส่งเงิน" ให้แล้ว) → หน้าหลักโหลดข้อมูลใหม่ */
  onHandoverDone?: () => void;
}

// ✅ ตัดตัวอักษรอื่นออกเหลือแต่ตัวเลขกับจุดทศนิยม (จุดเดียว) แล้วใส่ comma คั่นหลักพันให้อ่านง่าย
// ระหว่างพิมพ์ - กันพนักงานกรอกผิด/พิมพ์ตัวอักษรปนตัวเลขจนคำนวณเพี้ยน
const formatAmountInput = (raw: string): string => {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
  const [intPart, decPart] = cleaned.split(".");
  const formattedInt = intPart ? Number(intPart).toLocaleString("en-US") : "";
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
};

const parseAmount = (formatted: string): number => Number(formatted.replace(/,/g, "")) || 0;

const AddCashflowRowDialog = ({
  onClose, onAdd, isAdmin = false, allowHandover = false, onHandoverDone,
}: AddCashflowRowDialogProps) => {
  // adm: พิมพ์ "ส่งเงิน" เองได้ (กรณีพิเศษ) / พนักงาน: ส่งเงินได้เฉพาะส่วนเงินสด ผ่านการติ๊กรายการค้างส่ง
  const typeOptions = TYPE_FIELDS.filter((t) => isAdmin || t !== "sent" || allowHandover);
  const [description, setDescription] = useState("");
  const [type, setType] = useState<RowType>("income");
  const [amountInput, setAmountInput] = useState("");

  const amount = parseAmount(amountInput);
  const isValid = description.trim() !== "" && amount > 0;

  // ---------- ส่งเงิน (พนักงาน) ----------
  const handoverMode = type === "sent" && !isAdmin && allowHandover;
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const [unsent, setUnsent] = useState<UnsentItem[] | null>(null);
  const [history, setHistory] = useState<SendHistory[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!handoverMode || !token || unsent !== null) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE_URL}/cash-handover/unsent/`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/cash-handover/?limit=5`, { headers }).then((r) => r.json()).catch(() => []),
    ])
      .then(([u, h]) => {
        const list: UnsentItem[] = Array.isArray(u) ? u : [];
        setUnsent(list);
        setPicked(new Set(list.map(keyOf))); // ค่าเริ่มต้น: เลือกทั้งหมด
        setHistory(Array.isArray(h) ? h : []);
      })
      .catch(() => {
        setUnsent([]);
        toast.error("โหลดรายการค้างส่งไม่สำเร็จ");
      });
  }, [handoverMode, token, unsent]);

  const pickedItems = (unsent || []).filter((i) => picked.has(keyOf(i)));
  const pickedTotal = pickedItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const togglePick = (k: string) => {
    const next = new Set(picked);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setPicked(next);
  };

  const handleSendNow = async () => {
    if (!pickedItems.length || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/cash-handover/send-now/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ items: pickedItems.map(({ source, source_id }) => ({ source, source_id })) }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(json?.error || json?.detail || "ส่งเงินไม่สำเร็จ");
        if (res.status === 409) setUnsent(null); // โหลดรายการใหม่
        return;
      }
      toast.success(`ส่งเงินแล้ว ฿${fmt(pickedTotal)}`);
      onHandoverDone?.();
      onClose();
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setSending(false);
    }
  };

  const handleAdd = () => {
    if (!isValid) return;
    onAdd({ description: description.trim(), type, amount });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">เพิ่มรายการ</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          {/* รายการนั้นชื่ออะไร (ส่งเงินไม่ต้องกรอก - ระบบตั้งชื่อให้) */}
          {!handoverMode && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">รายการนี้คืออะไร</label>
            <input
              autoFocus
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isValid && handleAdd()}
              placeholder="เช่น ค่าน้ำมัน, ขายอะไหล่, ทอนเงินลูกค้า..."
              className="w-full text-sm border rounded-lg px-3 py-2 border-gray-300 outline-none focus:border-orange-400"
            />
          </div>
          )}

          {/* ทำอะไร (ประเภท) */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">ประเภทรายการ</label>
            <div className="grid grid-cols-3 gap-1.5">
              {typeOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`text-xs font-semibold rounded-md border px-2 py-2 transition-all ${
                    type === t ? `${TYPE_COLOR[t]} ring-2 ring-offset-1 ring-orange-400` : "border-gray-200 text-gray-400 bg-white"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* ✅ ส่งเงิน (พนักงาน): ติ๊กรายการเงินสดค้างส่งของตัวเอง ยอดรวมให้เอง พิมพ์ยอดเองไม่ได้ */}
          {handoverMode && (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">เงินสดที่ยังไม่ได้ส่ง</label>
              {unsent === null ? (
                <div className="text-sm text-gray-400 text-center py-4">กำลังโหลด...</div>
              ) : unsent.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4 border border-dashed rounded-lg">
                  ไม่มีเงินสดค้างส่ง
                </div>
              ) : (
                <div className="border rounded-lg max-h-56 overflow-y-auto divide-y">
                  {unsent.map((i) => {
                    const k = keyOf(i);
                    const on = picked.has(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => togglePick(k)}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 text-left text-sm ${on ? "bg-orange-50" : "bg-white"}`}
                      >
                        <span
                          className={`w-5 h-5 shrink-0 rounded border grid place-items-center ${
                            on ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 text-transparent"
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{i.description}</span>
                          <span className="block text-[11px] text-gray-400">{timeTH(i.record_date)}</span>
                        </span>
                        <span className="font-semibold whitespace-nowrap">{fmt(i.amount)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-between items-baseline mt-2 px-1">
                <span className="text-sm text-gray-600">ยอดส่ง ({pickedItems.length} รายการ)</span>
                <span className="text-lg font-bold text-gray-800">{fmt(pickedTotal)} บาท</span>
              </div>

              {/* ประวัติการส่งล่าสุดของฉัน */}
              {history.length > 0 && (
                <div className="mt-3 pt-2 border-t">
                  <p className="text-xs font-medium text-gray-500 mb-1">ส่งล่าสุด</p>
                  {history.map((h) => (
                    <div key={h.id} className="flex justify-between text-xs text-gray-500 py-0.5">
                      <span>
                        {timeTH(h.received_at || h.created_at)} · {h.items.length} รายการ
                        {h.status === "pending" && <span className="text-orange-600"> · รอ adm รับ</span>}
                      </span>
                      <span className="font-medium text-gray-700">{fmt(h.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* กี่บาท */}
          {!handoverMode && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">จำนวนเงิน</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(formatAmountInput(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && isValid && handleAdd()}
                placeholder="0"
                className="w-full text-right text-lg font-semibold border rounded-lg pl-3 pr-12 py-2 border-gray-300 outline-none focus:border-orange-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">บาท</span>
            </div>
          </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          {handoverMode ? (
            <button
              onClick={handleSendNow}
              disabled={!pickedItems.length || sending}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white text-sm font-medium py-2 rounded-lg"
            >
              {sending ? "กำลังส่ง..." : `ส่งเงิน ${fmt(pickedTotal)} บาท`}
            </button>
          ) : (
            <button
              onClick={handleAdd}
              disabled={!isValid}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white text-sm font-medium py-2 rounded-lg"
            >
              เพิ่มรายการ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCashflowRowDialog;