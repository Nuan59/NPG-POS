// ✅ ใช้ร่วมกัน: แท็บใบกำกับภาษีซื้อ + สรุปภาษี
export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
export const money = (n: number) => Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const thDate = (iso?: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "-";
export const yearOptions = () => {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2, y - 3];
};
/** ดาวน์โหลด CSV (เปิดใน Excel ได้ ภาษาไทยไม่เพี้ยน) */
export const downloadCsv = (filename: string, head: string[], rows: (string | number)[][]) => {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [head.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
export const selectCls = "rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#F26B1D]";
