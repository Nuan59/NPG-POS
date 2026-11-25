"use client";
// ✅ แท็บ "สรุปภาษี" (adm / ผู้ตรวจสอบ) - ภาษีขาย (ใบกำกับที่ออก) - ภาษีซื้อ (ใบนำเข้า) เลือกเดือน / ทั้งปี
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { API, TH_MONTHS, downloadCsv, money, selectCls, thDate, yearOptions } from "./taxShared";

interface Part {
  count: number;
  base: number;
  vat: number;
  total: number;
  rows: any[];
}
interface Summary {
  year: number;
  month: number | null;
  sales: Part;
  purchases: Part;
  net_vat: number;
  by_month: { month: number; sales_vat: number; purchase_vat: number; net: number; sales_count: number; purchase_count: number }[];
}

export default function TaxSummaryTab() {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | "">(new Date().getMonth() + 1);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/tax-summary/?year=${year}&month=${month || ""}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `โหลดไม่สำเร็จ (${res.status})`);
      setData(d);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, year, month]);

  useEffect(() => { load(); }, [load]);

  const period = month ? `${TH_MONTHS[Number(month) - 1]} ${year + 543}` : `ทั้งปี ${year + 543}`;
  const fileTag = month ? `${year + 543}-${String(month).padStart(2, "0")}` : `${year + 543}`;

  const exportSales = () =>
    data &&
    downloadCsv(`รายงานภาษีขาย-${fileTag}.csv`,
      ["วันที่", "เลขที่", "ผู้ซื้อ", "เลขผู้เสียภาษี", "สาขา", "มูลค่าสินค้า", "VAT", "รวม", "ผู้ออก"],
      data.sales.rows.map((r) => [r.issue_date, r.number, r.buyer_name, r.buyer_tax_id, r.buyer_branch, r.base_amount, r.vat_amount, r.amount, r.issued_by]));
  const exportPurchases = () =>
    data &&
    downloadCsv(`รายงานภาษีซื้อ-${fileTag}.csv`,
      ["วันที่ในใบ", "เลขที่ใบ", "ผู้ขาย", "เลขผู้เสียภาษี", "สาขา", "รายการ", "มูลค่าสินค้า", "VAT", "รวม", "เดือนภาษี", "ผู้บันทึก"],
      data.purchases.rows.map((r) => [r.invoice_date, r.invoice_no, r.supplier_name, r.supplier_tax_id, r.supplier_branch, r.description,
        r.base_amount, r.vat_amount, r.amount, `${r.tax_month}/${r.tax_year + 543}`, r.created_by]));

  const net = data?.net_vat ?? 0;
  const Card = ({ title, part, tone }: { title: string; part?: Part; tone: string }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`text-2xl font-bold tabular-nums ${tone}`}>{money(part?.vat ?? 0)} ฿</p>
      <p className="text-xs text-slate-500 tabular-nums mt-1">
        {part?.count ?? 0} ใบ · มูลค่า {money(part?.base ?? 0)} · รวม {money(part?.total ?? 0)}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>เดือน</span>
          <select className={`${selectCls} block`} value={month} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}>
            <option value="">ทั้งปี</option>
            {TH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>ปี</span>
          <select className={`${selectCls} block`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions().map((y) => <option key={y} value={y}>{y + 543}</option>)}
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportSales} disabled={!data?.sales.count}><Download size={16} /> ภาษีขาย (Excel)</Button>
          <Button variant="outline" className="gap-2" onClick={exportPurchases} disabled={!data?.purchases.count}><Download size={16} /> ภาษีซื้อ (Excel)</Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-14 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : (
        data && (
          <>
            <p className="text-sm font-semibold text-[#1e2432]">สรุปภาษีมูลค่าเพิ่ม · {period}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card title="ภาษีขาย (ใบกำกับที่ออก)" part={data.sales} tone="text-[#1e2432]" />
              <Card title="ภาษีซื้อ (ใบนำเข้า)" part={data.purchases} tone="text-[#1e2432]" />
              <div className={`rounded-xl border p-4 ${net >= 0 ? "border-orange-200 bg-orange-50" : "border-emerald-200 bg-emerald-50"}`}>
                <p className="text-sm text-slate-600">{net >= 0 ? "VAT ที่ต้องชำระ" : "ภาษีซื้อมากกว่า (ยกไป / ขอคืน)"}</p>
                <p className={`text-2xl font-bold tabular-nums ${net >= 0 ? "text-[#F26B1D]" : "text-emerald-700"}`}>{money(Math.abs(net))} ฿</p>
                <p className="text-xs text-slate-500 mt-1">ภาษีขาย − ภาษีซื้อ</p>
              </div>
            </div>

            {!month && (
              <div className="rounded-md bg-white">
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      {["เดือน", "ใบขาย", "ภาษีขาย", "ใบซื้อ", "ภาษีซื้อ", "สุทธิ"].map((h) => (
                        <TableHead key={h} className={`text-slate-900 font-bold ${h === "เดือน" ? "text-left" : "text-right"}`}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.by_month.map((m) => (
                      <TableRow key={m.month} className="cursor-pointer hover:bg-slate-50" onClick={() => setMonth(m.month)}>
                        <TableCell>{TH_MONTHS[m.month - 1]}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.sales_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(m.sales_vat)}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.purchase_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(m.purchase_vat)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-semibold ${m.net < 0 ? "text-emerald-700" : ""}`}>{money(m.net)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-md bg-white">
                <p className="px-3 py-2 text-sm font-semibold border-b">ภาษีขาย · {data.sales.count} ใบ</p>
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead>วันที่ / เลขที่</TableHead><TableHead>ผู้ซื้อ</TableHead>
                      <TableHead className="text-right">VAT</TableHead><TableHead className="text-right">รวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sales.rows.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-16 text-center text-slate-500">ไม่มี</TableCell></TableRow>
                    ) : data.sales.rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{thDate(r.issue_date)}<span className="block font-mono text-xs">{r.number}</span></TableCell>
                        <TableCell>{r.buyer_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.vat_amount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
              <section className="rounded-md bg-white">
                <p className="px-3 py-2 text-sm font-semibold border-b">ภาษีซื้อ · {data.purchases.count} ใบ</p>
                <Table>
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead>วันที่ / เลขที่</TableHead><TableHead>ผู้ขาย</TableHead>
                      <TableHead className="text-right">VAT</TableHead><TableHead className="text-right">รวม</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.purchases.rows.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-16 text-center text-slate-500">ไม่มี</TableCell></TableRow>
                    ) : data.purchases.rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap">{thDate(r.invoice_date)}<span className="block font-mono text-xs">{r.invoice_no}</span></TableCell>
                        <TableCell>{r.supplier_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.vat_amount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </section>
            </div>
          </>
        )
      )}
    </div>
  );
}
