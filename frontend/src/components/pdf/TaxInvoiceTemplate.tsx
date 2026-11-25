import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { registerFonts, ZWJ, sanitizeText } from "./Salereceiptutils";

registerFonts();

// ✅ ใบกำกับภาษี (ขายรถ) - ข้อมูลทั้งหมดมาจากใบที่บันทึกไว้ในระบบ (แก้ลูกค้าทีหลัง ใบเดิมไม่เปลี่ยน)
export interface TaxInvoiceData {
  number: string;
  status: "active" | "cancelled";
  issue_date: string;
  buyer_name: string;
  buyer_address: string;
  buyer_tax_id: string;
  buyer_branch: string;
  buyer_phone: string;
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

const BORDER = "1pt solid #1e2432";
const s = StyleSheet.create({
  page: { fontFamily: "Sarabun", fontSize: 10, padding: 32, color: "#111" },
  header: { flexDirection: "row", alignItems: "center", borderBottom: BORDER, paddingBottom: 8 },
  logo: { width: 70, height: 46, objectFit: "contain", marginRight: 10 },
  company: { flex: 1 },
  companyName: { fontSize: 14, fontWeight: "bold" },
  small: { fontSize: 9 },
  badge: { border: BORDER, paddingVertical: 3, paddingHorizontal: 10, fontWeight: "bold", fontSize: 10 },
  title: { textAlign: "center", fontSize: 16, fontWeight: "bold", marginTop: 10, marginBottom: 8 },
  infoBox: { flexDirection: "row", border: BORDER, marginBottom: 8 },
  left: { flex: 3, padding: 6, borderRight: BORDER },
  right: { flex: 2, padding: 6 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 118, fontWeight: "bold" },
  labelR: { width: 58, fontWeight: "bold" },
  val: { flex: 1 },
  th: { flexDirection: "row", backgroundColor: "#eef0f4", borderTop: BORDER, borderBottom: BORDER, borderLeft: BORDER, borderRight: BORDER },
  td: { flexDirection: "row", borderLeft: BORDER, borderRight: BORDER, borderBottom: BORDER, minHeight: 90 },
  c1: { width: 36, padding: 4, textAlign: "center", borderRight: BORDER },
  c2: { flex: 1, padding: 4, borderRight: BORDER },
  c3: { width: 50, padding: 4, textAlign: "center", borderRight: BORDER },
  c4: { width: 100, padding: 4, textAlign: "right" },
  sumWrap: { flexDirection: "row", marginTop: 0 },
  words: { flex: 1, border: BORDER, borderTop: 0, padding: 6, justifyContent: "center" },
  sum: { width: 250, borderRight: BORDER, borderBottom: BORDER },
  sumRow: { flexDirection: "row", borderBottom: "0.5pt solid #999", paddingVertical: 4, paddingHorizontal: 6 },
  sumLabel: { flex: 1 },
  sumVal: { width: 100, textAlign: "right" },
  total: { fontWeight: "bold", fontSize: 11 },
  signs: { flexDirection: "row", marginTop: 36, justifyContent: "space-between" },
  sign: { width: "42%", alignItems: "center" },
  line: { borderBottom: "0.8pt dotted #333", width: "100%", height: 26 },
  cancelled: {
    position: "absolute", top: 300, left: 90, fontSize: 80, color: "#dc2626", opacity: 0.25,
    transform: "rotate(-30deg)", fontWeight: "bold",
  },
  cancelNote: { marginTop: 10, color: "#b91c1c", fontSize: 9 },
});

const InvoicePage = ({ inv, badge, logoUrl }: { inv: TaxInvoiceData; badge: string; logoUrl?: string }) => (
  <Page size="A4" style={s.page}>
    <View style={s.header}>
      <Image src={logoUrl || "/logo.png"} style={s.logo} />
      <View style={s.company}>
        <Text style={s.companyName}>ห้างหุ้นส่วนจำกัด นพดลมอเตอร์กรุ้ป{ZWJ}</Text>
        <Text style={s.small}>359/2 หมู่ 6 ตำบลร้องเข็ม อำเภอร้องกวาง จังหวัดแพร่ 54140{ZWJ}</Text>
        <Text style={s.small}>โทร. 099-376-8889  เลขประจำตัวผู้เสียภาษี 0543564001773 (สำนักงานใหญ่){ZWJ}</Text>
      </View>
      <Text style={s.badge}>{badge}{ZWJ}</Text>
    </View>

    <Text style={s.title}>ใบกำกับภาษี / TAX INVOICE{ZWJ}</Text>

    <View style={s.infoBox}>
      <View style={s.left}>
        <View style={s.row}><Text style={s.label}>ผู้ซื้อ (ผู้รับ)</Text><Text style={s.val}>{sanitizeText(inv.buyer_name)}{ZWJ}</Text></View>
        <View style={s.row}><Text style={s.label}>ที่อยู่</Text><Text style={s.val}>{sanitizeText(inv.buyer_address) || "-"}{ZWJ}</Text></View>
        <View style={s.row}>
          <Text style={s.label}>เลขประจำตัวผู้เสียภาษี</Text>
          <Text style={s.val}>{fmtTaxId(inv.buyer_tax_id)}{inv.buyer_branch ? `  สาขา ${sanitizeText(inv.buyer_branch)}` : ""}{ZWJ}</Text>
        </View>
        {!!inv.buyer_phone && <View style={s.row}><Text style={s.label}>โทร</Text><Text style={s.val}>{inv.buyer_phone}</Text></View>}
      </View>
      <View style={s.right}>
        <View style={s.row}><Text style={s.labelR}>เลขที่</Text><Text style={{ ...s.val, fontWeight: "bold" }}>{inv.number}</Text></View>
        <View style={s.row}><Text style={s.labelR}>วันที่ออก</Text><Text style={s.val}>{thaiDate(inv.issue_date)}{ZWJ}</Text></View>
        <View style={s.row}><Text style={s.labelR}>ผู้ออก</Text><Text style={s.val}>{sanitizeText(inv.issued_by) || "-"}{ZWJ}</Text></View>
      </View>
    </View>

    <View style={s.th}>
      <Text style={s.c1}>ลำดับ</Text>
      <Text style={s.c2}>รายการ</Text>
      <Text style={s.c3}>จำ{ZWJ}นวน</Text>
      <Text style={s.c4}>จำ{ZWJ}นวนเงิน (บาท)</Text>
    </View>
    <View style={s.td}>
      <Text style={s.c1}>1</Text>
      <Text style={s.c2}>{sanitizeText(inv.item_description)}{ZWJ}</Text>
      <Text style={s.c3}>1 คัน</Text>
      <Text style={s.c4}>{money(inv.base_amount)}</Text>
    </View>

    <View style={s.sumWrap}>
      <View style={s.words}>
        <Text>({bahtText(inv.amount)}){ZWJ}</Text>
      </View>
      <View style={s.sum}>
        <View style={s.sumRow}><Text style={s.sumLabel}>มูลค่าสินค้า</Text><Text style={s.sumVal}>{money(inv.base_amount)}</Text></View>
        <View style={s.sumRow}><Text style={s.sumLabel}>ภาษีมูลค่าเพิ่ม {inv.vat_rate}%</Text><Text style={s.sumVal}>{money(inv.vat_amount)}</Text></View>
        <View style={{ ...s.sumRow, borderBottom: 0 }}>
          <Text style={{ ...s.sumLabel, ...s.total }}>รวมทั้งสิ้น</Text>
          <Text style={{ ...s.sumVal, ...s.total }}>{money(inv.amount)}</Text>
        </View>
      </View>
    </View>
    <Text style={{ ...s.small, marginTop: 4 }}>ราคาสินค้ารวมภาษีมูลค่าเพิ่มแล้ว{ZWJ}</Text>

    <View style={s.signs}>
      <View style={s.sign}>
        <View style={s.line} />
        <Text>ผู้รับใบกำกับภาษี{ZWJ}</Text>
        <Text style={s.small}>({sanitizeText(inv.buyer_name)}){ZWJ}</Text>
      </View>
      <View style={s.sign}>
        <View style={s.line} />
        <Text>ผู้ออกใบกำกับภาษี{ZWJ}</Text>
        <Text style={s.small}>({sanitizeText(inv.issued_by)}) · {thaiDate(inv.issue_date)}{ZWJ}</Text>
      </View>
    </View>

    {inv.status === "cancelled" && (
      <>
        <Text style={s.cancelled}>ยกเลิก</Text>
        <Text style={s.cancelNote}>
          ยกเลิกโดย {sanitizeText(inv.cancelled_by || "-")} · เหตุผล: {sanitizeText(inv.cancel_reason || "-")}{ZWJ}
        </Text>
      </>
    )}
  </Page>
);

export default function TaxInvoiceTemplate({ inv, logoUrl }: { inv: TaxInvoiceData; logoUrl?: string }) {
  return (
    <Document title={inv.number}>
      <InvoicePage inv={inv} badge="ต้นฉบับ" logoUrl={logoUrl} />
      <InvoicePage inv={inv} badge="สำเนา" logoUrl={logoUrl} />
    </Document>
  );
}
