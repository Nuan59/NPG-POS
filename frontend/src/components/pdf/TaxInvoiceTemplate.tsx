import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { registerFonts, ZWJ, sanitizeText } from "./Salereceiptutils";

registerFonts();

/**
 * ✅ ตัดบรรทัดภาษาไทยตามคำ (Intl.Segmenter) - ไทยไม่มีเว้นวรรค ถ้าไม่ตัดตามคำ ข้อความยาวจะล้นช่อง
 * คืนค่าเป็น [คำ, "", คำ, "", ...] - ใส่ "" คั่นทำให้ react-pdf ตัดบรรทัดตรงรอยคำโดยไม่เติมขีด "-"
 * ตั้งตอนสร้างใบ (ไฟล์ PDF อื่นตั้งแบบไม่ตัดคำไว้ตอนโหลด)
 */
const SEG: any = typeof Intl !== "undefined" && (Intl as any).Segmenter ? new (Intl as any).Segmenter("th", { granularity: "word" }) : null;
const useThaiWordBreak = () => {
  Font.registerHyphenationCallback((word: string) => {
    if (!SEG || !/[\u0E00-\u0E7F]/.test(word)) return [word];
    const parts = Array.from(SEG.segment(word), (x: any) => x.segment as string).filter(Boolean);
    return parts.length > 1 ? parts.flatMap((p, i) => (i < parts.length - 1 ? [p, ""] : [p])) : [word];
  });
};

// ✅ ใบกำกับภาษี (ขายรถ) - ข้อมูลทั้งหมดมาจากใบที่บันทึกไว้ในระบบ (แก้ลูกค้าทีหลัง ใบเดิมไม่เปลี่ยน)
export interface TaxInvoiceData {
  number: string;
  status: "active" | "cancelled" | "preview"; // preview = ดูตัวอย่างก่อนออก (ยังไม่มีเลขที่)
  issue_date: string;
  buyer_name: string;
  buyer_address: string;
  buyer_tax_id: string;
  buyer_branch: string;
  buyer_phone: string;
  receiver_name?: string; // ✅ ผู้รับ (คนที่มารับรถ/ใบ) - ไม่จำเป็นต้องเป็นผู้ซื้อ
  item_description: string;
  amount: number;
  base_amount: number;
  vat_amount: number;
  vat_rate: number;
  issued_by: string;
  created_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string;
  cancel_reason?: string;
}

const money = (n: number) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const thaiDate = (iso: string) => {
  try {
    return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
};

const fmtTaxId = (id: string) => {
  const d = (id || "").replace(/\D/g, "");
  return d.length === 13 ? `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}` : id || "-";
};

/** ตัวเลข → ตัวหนังสือ (มีสตางค์) เช่น 49,000.50 = สี่หมื่นเก้าพันบาทห้าสิบสตางค์ */
const readInt = (n: number): string => {
  const ones = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const pos = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
  if (n === 0) return "";
  if (n >= 1_000_000) return readInt(Math.floor(n / 1_000_000)) + "ล้าน" + readInt(n % 1_000_000);
  const s = String(n);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const p = s.length - i - 1;
    if (d === 0) continue;
    if (p === 0 && d === 1 && s.length > 1) out += "เอ็ด";
    else if (p === 1 && d === 1) out += "สิบ";
    else if (p === 1 && d === 2) out += "ยี่สิบ";
    else out += ones[d] + pos[p];
  }
  return out;
};
export const bahtText = (amount: number): string => {
  const satang = Math.round((amount % 1) * 100);
  const baht = Math.floor(amount);
  if (baht === 0 && satang === 0) return "ศูนย์บาทถ้วน";
  return (baht ? readInt(baht) + "บาท" : "") + (satang ? readInt(satang) + "สตางค์" : "ถ้วน");
};

/**
 * ✅ แก้ตัวอักษรหาย: react-pdf นับ "ำ" เป็น 2 ตัว (ํ + า) แล้วตัดตัวท้ายข้อความทิ้งทีละตัวต่อ ำ
 * (เช่น "ลำดับ" → "ลำดั", "(สำนักงานใหญ่)" → ไม่มีวงเล็บปิด) - แยก ำ เป็น ํ + า ก่อนวาด หน้าตาเหมือนเดิม
 */
const fixThai = (x: string) => x.replace(/\u0E33/g, "\u0E4D\u0E32");
const Tx = ({ style, children }: { style?: any; children?: React.ReactNode }) => (
  <Text style={style}>
    {React.Children.map(children, (c) => (typeof c === "string" ? fixThai(c) : typeof c === "number" ? String(c) : c))}
  </Text>
);

const BORDER = "1pt solid #1e2432";
const LIGHT = "0.5pt solid #9aa1ad";
const s = StyleSheet.create({
  // ✅ เต็มหน้า A4 แบ่งสัดส่วน: หัว · ข้อมูล · ตารางรายการ · สรุปยอด · หมายเหตุ · ช่องเซ็นล่างสุด
  page: { fontFamily: "Sarabun", fontSize: 11.5, paddingTop: 34, paddingBottom: 36, paddingHorizontal: 38, color: "#111", flexDirection: "column" },
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 10, borderBottom: "1.5pt solid #1e2432" },
  logo: { width: 96, height: 62, objectFit: "contain", marginRight: 14 },
  company: { flex: 1 },
  companyName: { fontSize: 16.5, fontWeight: "bold", marginBottom: 2 },
  small: { fontSize: 10 },
  badgeBox: { alignItems: "flex-end" },
  badge: { border: BORDER, paddingVertical: 4, paddingHorizontal: 16, fontWeight: "bold", fontSize: 12 },
  title: { textAlign: "center", fontSize: 22, fontWeight: "bold", marginTop: 14, marginBottom: 12, letterSpacing: 1 },
  infoWrap: { flexDirection: "row", marginBottom: 12 },
  box: { border: BORDER, padding: 9 },
  boxTitle: { fontWeight: "bold", fontSize: 12, marginBottom: 5, paddingBottom: 3, borderBottom: LIGHT },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 128, color: "#374151" },
  labelR: { width: 64, color: "#374151" },
  val: { flex: 1 },
  th: { flexDirection: "row", backgroundColor: "#eef0f4", border: BORDER, fontWeight: "bold" },
  td: { flexDirection: "row", borderLeft: BORDER, borderRight: BORDER, borderBottom: BORDER, height: 250 },
  c1: { width: 58, padding: 7, textAlign: "center", borderRight: BORDER },
  c2: { flex: 1, padding: 7, borderRight: BORDER, lineHeight: 1.5 },
  c3: { width: 64, padding: 7, textAlign: "center", borderRight: BORDER },
  c4: { width: 124, padding: 7, textAlign: "right" },
  sumWrap: { flexDirection: "row" },
  words: { flex: 1, border: BORDER, borderTop: 0, padding: 9, justifyContent: "center" },
  wordsLabel: { fontSize: 9.5, color: "#6b7280", marginBottom: 2 },
  sum: { width: 300, borderRight: BORDER, borderBottom: BORDER },
  sumRow: { flexDirection: "row", borderBottom: LIGHT, paddingVertical: 6, paddingHorizontal: 9 },
  sumLabel: { flex: 1 },
  sumVal: { width: 124, textAlign: "right" },
  total: { fontWeight: "bold", fontSize: 13.5 },
  note: { marginTop: 10, fontSize: 10, color: "#374151" },
  spacer: { flexGrow: 1 },
  signs: { flexDirection: "row", justifyContent: "space-between" },
  sign: { width: "40%", alignItems: "center" },
  line: { borderBottom: "0.8pt dotted #333", width: "100%", height: 40, marginBottom: 4 },
  signTitle: { fontWeight: "bold" },
  cancelled: {
    position: "absolute", top: 380, left: 120, fontSize: 100, color: "#dc2626", opacity: 0.2,
    transform: "rotate(-30deg)", fontWeight: "bold",
  },
  cancelNote: { marginTop: 8, color: "#b91c1c", fontSize: 10 },
});

const Field = ({ label, value, w = "label" }: { label: string; value: string; w?: "label" | "labelR" }) => (
  <View style={s.row}>
    <Tx style={s[w]}>{label}{ZWJ}</Tx>
    <Tx style={s.val}>{value || "-"}{ZWJ}</Tx>
  </View>
);

const InvoicePage = ({ inv, badge, logoUrl }: { inv: TaxInvoiceData; badge: string; logoUrl?: string }) => (
  <Page size="A4" style={s.page}>
    <View style={s.header}>
      <Image src={logoUrl || "/logo.png"} style={s.logo} />
      <View style={s.company}>
        <Tx style={s.companyName}>ห้างหุ้นส่วนจำกัด นพดลมอเตอร์กรุ้ป{ZWJ}</Tx>
        <Tx style={s.small}>359/2 หมู่ 6 ตำบลร้องเข็ม อำเภอร้องกวาง จังหวัดแพร่ 54140{ZWJ}</Tx>
        <Tx style={s.small}>โทร. 099-376-8889{ZWJ}</Tx>
        <Tx style={s.small}>เลขประจำตัวผู้เสียภาษี 0543564001773 (สำนักงานใหญ่){ZWJ}</Tx>
      </View>
      <View style={s.badgeBox}>
        <Tx style={s.badge}>{badge}{ZWJ}</Tx>
      </View>
    </View>

    <Tx style={s.title}>ใบกำกับภาษี{ZWJ}</Tx>

    <View style={s.infoWrap}>
      <View style={{ ...s.box, flex: 3, marginRight: 8 }}>
        <Tx style={s.boxTitle}>ผู้ซื้อ{ZWJ}</Tx>
        <Field label="ชื่อ" value={sanitizeText(inv.buyer_name)} />
        <Field label="ที่อยู่" value={sanitizeText(inv.buyer_address)} />
        <Field
          label="เลขประจำตัวผู้เสียภาษี"
          value={`${fmtTaxId(inv.buyer_tax_id)}${inv.buyer_branch ? `  สาขา ${sanitizeText(inv.buyer_branch)}` : ""}`}
        />
        {!!inv.buyer_phone && <Field label="โทร" value={inv.buyer_phone} />}
      </View>
      <View style={{ ...s.box, flex: 2 }}>
        <Tx style={s.boxTitle}>เอกสาร{ZWJ}</Tx>
        <View style={s.row}>
          <Tx style={s.labelR}>เลขที่{ZWJ}</Tx>
          <Tx style={{ ...s.val, fontWeight: "bold" }}>{inv.number}{ZWJ}</Tx>
        </View>
        <Field w="labelR" label="วันที่ออก" value={thaiDate(inv.issue_date)} />
        <Field w="labelR" label="ผู้ออก" value={sanitizeText(inv.issued_by)} />
        <Field w="labelR" label="ผู้รับ" value={sanitizeText(inv.receiver_name || "")} />
      </View>
    </View>

    <View style={s.th}>
      <Tx style={s.c1}>ลำดับ{ZWJ}</Tx>
      <Tx style={s.c2}>รายการ{ZWJ}</Tx>
      <Tx style={s.c3}>จำ{ZWJ}นวน{ZWJ}</Tx>
      <Tx style={s.c4}>จำ{ZWJ}นวนเงิน (บาท){ZWJ}</Tx>
    </View>
    <View style={s.td}>
      <Tx style={s.c1}>1</Tx>
      <Tx style={s.c2}>{sanitizeText(inv.item_description)}{ZWJ}</Tx>
      <Tx style={s.c3}>1 คัน{ZWJ}</Tx>
      <Tx style={s.c4}>{money(inv.base_amount)}</Tx>
    </View>

    <View style={s.sumWrap}>
      <View style={s.words}>
        <Tx style={s.wordsLabel}>จำ{ZWJ}นวนเงินรวม (ตัวอักษร){ZWJ}</Tx>
        <Tx style={{ fontWeight: "bold" }}>({bahtText(inv.amount)}){ZWJ}</Tx>
      </View>
      <View style={s.sum}>
        <View style={s.sumRow}><Tx style={s.sumLabel}>มูลค่าสินค้า{ZWJ}</Tx><Tx style={s.sumVal}>{money(inv.base_amount)}</Tx></View>
        <View style={s.sumRow}><Tx style={s.sumLabel}>ภาษีมูลค่าเพิ่ม {inv.vat_rate}%{ZWJ}</Tx><Tx style={s.sumVal}>{money(inv.vat_amount)}</Tx></View>
        <View style={{ ...s.sumRow, borderBottom: 0 }}>
          <Tx style={{ ...s.sumLabel, ...s.total }}>รวมทั้งสิ้น{ZWJ}</Tx>
          <Tx style={{ ...s.sumVal, ...s.total }}>{money(inv.amount)}</Tx>
        </View>
      </View>
    </View>
    <Tx style={s.note}>หมายเหตุ: ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว{ZWJ}</Tx>
    {inv.status === "cancelled" && (
      <Tx style={s.cancelNote}>
        ยกเลิกโดย {sanitizeText(inv.cancelled_by || "-")} · เหตุผล: {sanitizeText(inv.cancel_reason || "-")}{ZWJ}
      </Tx>
    )}

    <View style={s.spacer} />

    <View style={s.signs}>
      <View style={s.sign}>
        <View style={s.line} />
        <Tx style={s.signTitle}>ผู้รับ{ZWJ}</Tx>
        <Tx style={s.small}>
          ({inv.receiver_name ? sanitizeText(inv.receiver_name) : "............................................................"}){ZWJ}
        </Tx>
        <Tx style={s.small}>วันที่ ........../........../..........{ZWJ}</Tx>
      </View>
      <View style={s.sign}>
        <View style={s.line} />
        <Tx style={s.signTitle}>ผู้ออก{ZWJ}</Tx>
        <Tx style={s.small}>({sanitizeText(inv.issued_by)}){ZWJ}</Tx>
        <Tx style={s.small}>วันที่ {thaiDate(inv.issue_date)}{ZWJ}</Tx>
      </View>
    </View>

    {inv.status === "preview" && <Tx style={s.cancelled}>ตัวอย่าง{ZWJ}</Tx>}
    {inv.status === "cancelled" && <Tx style={s.cancelled}>ยกเลิก{ZWJ}</Tx>}
  </Page>
);

export default function TaxInvoiceTemplate({ inv, logoUrl }: { inv: TaxInvoiceData; logoUrl?: string }) {
  useThaiWordBreak();
  return (
    <Document title={inv.number}>
      <InvoicePage inv={inv} badge="ต้นฉบับ" logoUrl={logoUrl} />
      <InvoicePage inv={inv} badge="สำเนา" logoUrl={logoUrl} />
    </Document>
  );
}
