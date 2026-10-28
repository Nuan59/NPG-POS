// BikeSourcesPanel.tsx
// วางไฟล์นี้ใน: src/app/(private)/storage/components/BikeSourcesPanel.tsx
"use client";

/**
 * ✅ ที่มารถ (ร้าน / ซัพพลายเออร์ที่รับรถมา) - แท็บในเมนู คลัง
 * - ทุกคน: ดูรายการ + เพิ่มที่มาใหม่ (พนักงานกรอกแค่โค้ด)
 * - adm: เห็นชื่อเต็ม / ใส่ชื่อตอนเพิ่มได้ / แก้โค้ด-ชื่อ / ลบ (เฉพาะที่ยังไม่มีรถใช้)
 * หน้าเพิ่มสินค้าเลือกที่มาจาก dropdown อย่างเดียว
 */
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BikeSource {
  id: number;
  code: string;
  name?: string; // มีเฉพาะ adm
  bike_count?: number;
  in_stock?: number;
  sold_count?: number;
}

const cleanCode = (v: string) => v.replace(/\s+/g, "").toUpperCase();

const BikeSourcesPanel = ({ searchTerm = "" }: { searchTerm?: string }) => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const isAdm = String((session as any)?.user?.role || "").toLowerCase() === "adm";

  const [sources, setSources] = useState<BikeSource[] | null>(null);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");

  const api = (path: string, init?: RequestInit) =>
    fetch(`${API_BASE_URL}/bike-sources/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

  const load = () => {
    if (!token) return;
    api("")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSources(Array.isArray(d) ? d : []))
      .catch(() => {
        setSources([]);
        toast.error("โหลดที่มารถไม่สำเร็จ");
      });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [token]);

  const shown = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sources || [];
    return (sources || []).filter(
      (s) => s.code.toLowerCase().includes(q) || (s.name || "").toLowerCase().includes(q)
    );
  }, [sources, searchTerm]);

  const add = async () => {
    const code = cleanCode(newCode);
    if (!code) return toast.error("กรุณากรอกโค้ด");
    setBusy(true);
    try {
      const res = await api("", { method: "POST", body: JSON.stringify({ code, name: isAdm ? newName.trim() : "" }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) return toast.error(d?.error || "เพิ่มที่มาไม่สำเร็จ");
      toast.success(`เพิ่มที่มา ${d.code} แล้ว`);
      setNewCode("");
      setNewName("");
      load();
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (editId === null) return;
    const code = cleanCode(editCode);
    if (!code) return toast.error("กรุณากรอกโค้ด");
    setBusy(true);
    try {
      const res = await api(`${editId}/`, { method: "PATCH", body: JSON.stringify({ code, name: editName.trim() }) });
      const d = await res.json().catch(() => null);
      if (!res.ok) return toast.error(d?.error || "บันทึกไม่สำเร็จ");
      toast.success(`บันทึก ${d.code} แล้ว`);
      setEditId(null);
      load();
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: BikeSource) => {
    if (!window.confirm(`ลบที่มา ${s.code}?`)) return;
    setBusy(true);
    try {
      const res = await api(`${s.id}/`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        return toast.error(d?.error || "ลบไม่สำเร็จ");
      }
      toast.success(`ลบที่มา ${s.code} แล้ว`);
      load();
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setBusy(false);
    }
  };

  const onEnter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-4">
      {/* เพิ่มที่มาใหม่ */}
      <div className="border rounded-lg p-3 flex flex-wrap items-center gap-2 bg-orange-50/40">
        <span className="text-sm font-medium mr-1">เพิ่มที่มาใหม่</span>
        <Input
          className="w-36 uppercase"
          placeholder="โค้ด เช่น AP"
          maxLength={20}
          value={newCode}
          onChange={(e) => setNewCode(e.target.value.toUpperCase())}
          onKeyDown={onEnter(add)}
        />
        {isAdm && (
          <Input
            className="flex-1 min-w-[200px]"
            placeholder="ชื่อร้าน / ซัพพลายเออร์ (ใส่ทีหลังได้)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={onEnter(add)}
          />
        )}
        <Button type="button" onClick={add} disabled={busy} className="gap-1">
          <Plus size={16} /> เพิ่ม
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">โค้ด</TableHead>
              {isAdm && <TableHead>ชื่อร้าน / ซัพพลายเออร์</TableHead>}
              <TableHead className="w-[110px] text-right">คงเหลือ</TableHead>
              <TableHead className="w-[110px] text-right">ขายแล้ว</TableHead>
              {isAdm && <TableHead className="w-[120px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources === null ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  กำลังโหลด...
                </TableCell>
              </TableRow>
            ) : shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {sources.length === 0 ? "ยังไม่มีที่มา เพิ่มได้จากช่องด้านบน" : "ไม่พบที่มาที่ค้นหา"}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((s) =>
                editId === s.id ? (
                  <TableRow key={s.id} className="bg-orange-50/40">
                    <TableCell>
                      <Input
                        autoFocus
                        className="uppercase"
                        maxLength={20}
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                        onKeyDown={onEnter(saveEdit)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="ชื่อร้าน / ซัพพลายเออร์"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={onEnter(saveEdit)}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.in_stock ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.sold_count ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={saveEdit} disabled={busy} aria-label="บันทึก">
                          <Check size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditId(null)} disabled={busy} aria-label="ยกเลิก">
                          <X size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold">{s.code}</TableCell>
                    {isAdm && (
                      <TableCell>
                        {s.name ? s.name : <span className="text-orange-600 text-sm">ยังไม่มีชื่อ</span>}
                      </TableCell>
                    )}
                    {/* ✅ กดตัวเลข → ดูรถจากที่มานี้ในหน้าสินค้า */}
                    <TableCell className="text-right tabular-nums">
                      {(s.in_stock ?? 0) > 0 ? (
                        <Link
                          href={`/inventory/all?source=${encodeURIComponent(s.code)}`}
                          className="text-orange-600 font-semibold underline-offset-2 hover:underline"
                          title={`ดูรถคงเหลือจาก ${s.code}`}
                        >
                          {s.in_stock}
                        </Link>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(s.sold_count ?? 0) > 0 ? (
                        <Link
                          href={`/inventory/all?source=${encodeURIComponent(s.code)}&sold=1`}
                          className="text-gray-700 underline-offset-2 hover:underline"
                          title={`ดูรถทั้งหมดจาก ${s.code} (รวมขายแล้ว)`}
                        >
                          {s.sold_count}
                        </Link>
                      ) : (
                        0
                      )}
                    </TableCell>
                    {isAdm && (
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="แก้ไข"
                            onClick={() => {
                              setEditId(s.id);
                              setEditCode(s.code);
                              setEditName(s.name || "");
                            }}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="ลบ"
                            className="text-red-600 hover:text-red-700"
                            disabled={busy || (s.bike_count ?? 0) > 0}
                            title={(s.bike_count ?? 0) > 0 ? "มีรถใช้ที่มานี้อยู่ ลบไม่ได้" : "ลบ"}
                            onClick={() => remove(s)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BikeSourcesPanel;