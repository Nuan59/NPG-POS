"use client";

import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import {
  registerFonts,
  ZWJ,
  sanitizeText,
  fmt,
} from "@/components/pdf/Salereceiptutils";

registerFonts();

const COMPANY_NAME = "ห้างหุ้นส่วนจำกัด นพดลมอเตอร์กรุ้ป";
const COMPANY_ADDRESS = "359/2 หมู่ 6 ตำบลร้องเข็ม อำเภอร้องกวาง จังหวัดแพร่ 54140";
const COMPANY_TAX = "โทร. 099-376-8889  เลขประจำตัวผู้เสียภาษี 0543564001773";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Sarabun",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottom: "2pt solid #1a1a1a",
    paddingBottom: 12,
    marginBottom: 16,
  },
  logoContainer: { width: 55, height: 55, marginRight: 10 },
  logo: { width: "100%", height: "100%", objectFit: "contain" },
  companyInfo: { flex: 1 },
  companyName: { fontSize: 14, fontWeight: "bold", marginBottom: 2 },
  companyDetail: { fontSize: 8.5, color: "#444", marginBottom: 1 },

  titleBlock: { textAlign: "center", marginBottom: 14 },
  reportTitle: { fontSize: 13, fontWeight: "bold" },
  reportPeriod: { fontSize: 10, color: "#333", marginTop: 2 },
  reportDate: { fontSize: 8, color: "#888", marginBottom: 10, textAlign: "right" },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 6,
    borderLeft: "3pt solid #1a1a1a",
    paddingLeft: 6,
  },

  summaryGrid: { flexDirection: "row", flexWrap: "wrap", border: "1pt solid #ccc" },
  summaryCell: { width: "25%", padding: 8, borderRight: "1pt solid #ccc", borderBottom: "1pt solid #ccc" },
  summaryLabel: { fontSize: 8, color: "#666", marginBottom: 3 },
  summaryValue: { fontSize: 12, fontWeight: "bold" },

  table: { border: "1pt solid #999" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#e5e5e5", borderBottom: "1pt solid #999" },
  tableRow: { flexDirection: "row", borderBottom: "0.5pt solid #ddd" },
  tableRowTotal: { flexDirection: "row", backgroundColor: "#f0f0f0", borderTop: "1pt solid #999" },
  th: { padding: 5, fontSize: 8.5, fontWeight: "bold" },
  td: { padding: 5, fontSize: 8.5 },

  signSection: { flexDirection: "row", justifyContent: "space-around", marginTop: 50 },
  signBox: { width: "35%", textAlign: "center" },
  signLine: { marginTop: 30, paddingTop: 4, borderTop: "1pt solid #000", fontSize: 9 },
});

type MonthlyRow = {
  month: string;
  total: number;
  new: number;
  pre_owned: number;
};

type DetailRow = {
  date: string;
  modelLabel: string;
  paymentLabel: string;
  amount: number;
};

type SummaryData = {
  totalOrders: number;
  totalVehicles: number;
  newCount: number;
  usedCount: number;
  cashCount: number;
  installmentCount: number;
  totalAmount: number;
};

interface SalesReportPDFProps {
  summary: SummaryData;
  monthlyData: MonthlyRow[];
  detailRows: DetailRow[];
  periodLabel: string;
}

const today = new Date().toLocaleDateString("th-TH", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function SalesReportPDF({
  summary,
  monthlyData,
  detailRows,
  periodLabel,
}: SalesReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src="/logo.png" style={styles.logo} />
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{COMPANY_NAME}{ZWJ}</Text>
            <Text style={styles.companyDetail}>{COMPANY_ADDRESS}{ZWJ}</Text>
            <Text style={styles.companyDetail}>{COMPANY_TAX}{ZWJ}</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.reportTitle}>รายงานสรุปยอดขาย{ZWJ}</Text>
          <Text style={styles.reportPeriod}>{sanitizeText(`ประจำ${periodLabel}`)}{ZWJ}</Text>
        </View>

        <Text style={styles.reportDate}>{sanitizeText(`จัดทำรายงานวันที่ ${today}`)}{ZWJ}</Text>

        {/* สรุปภาพรวม */}
        <Text style={styles.sectionTitle}>สรุปภาพรวม{ZWJ}</Text>
        <View style={styles.summaryGrid} wrap={false}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>จำนวนออเดอร์{ZWJ}</Text>
            <Text style={styles.summaryValue}>{summary.totalOrders}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>จำ{ZWJ}นวนคันที่ขาย{ZWJ}</Text>
            <Text style={styles.summaryValue}>{summary.totalVehicles}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>รถใหม่ / มือสอง{ZWJ}</Text>
            <Text style={styles.summaryValue}>{summary.newCount} / {summary.usedCount}</Text>
          </View>
          <View style={[styles.summaryCell, { borderRight: "none" }]}>
            <Text style={styles.summaryLabel}>เงินสด / ผ่อนชำระ{ZWJ}</Text>
            <Text style={styles.summaryValue}>{summary.cashCount} / {summary.installmentCount}</Text>
          </View>
          <View style={[styles.summaryCell, { width: "100%", borderRight: "none" }]}>
            <Text style={styles.summaryLabel}>ยอดขายรวม{ZWJ}</Text>
            <Text style={styles.summaryValue}>{fmt(summary.totalAmount)} บาท</Text>
          </View>
        </View>

        {/* ตารางรายเดือน */}
        <Text style={styles.sectionTitle}>สรุปรายเดือน{ZWJ}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            <Text style={[styles.th, { width: "25%" }]}>เดือน{ZWJ}</Text>
            <Text style={[styles.th, { width: "25%", textAlign: "right" }]}>ยอดขายรวม{ZWJ}</Text>
            <Text style={[styles.th, { width: "25%", textAlign: "right" }]}>รถใหม่{ZWJ}</Text>
            <Text style={[styles.th, { width: "25%", textAlign: "right" }]}>รถมือสอง{ZWJ}</Text>
          </View>
          {monthlyData.map((row, idx) => (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, { width: "25%" }]}>{sanitizeText(row.month)}{ZWJ}</Text>
              <Text style={[styles.td, { width: "25%", textAlign: "right" }]}>{row.total}</Text>
              <Text style={[styles.td, { width: "25%", textAlign: "right" }]}>{row.new}</Text>
              <Text style={[styles.td, { width: "25%", textAlign: "right" }]}>{row.pre_owned}</Text>
            </View>
          ))}
          <View style={styles.tableRowTotal} wrap={false}>
            <Text style={[styles.th, { width: "25%" }]}>รวม{ZWJ}</Text>
            <Text style={[styles.th, { width: "25%", textAlign: "right" }]}>
              {monthlyData.reduce((s, r) => s + r.total, 0)}
            </Text>
            <Text style={[styles.th, { width: "25%", textAlign: "right" }]}>
              {monthlyData.reduce((s, r) => s + r.new, 0)}
            </Text>
            <Text style={[styles.th, { width: "25%", textAlign: "right" }]}>
              {monthlyData.reduce((s, r) => s + r.pre_owned, 0)}
            </Text>
          </View>
        </View>

        {/* ตารางรายละเอียด - หัวตาราง fixed จะขึ้นซ้ำอัตโนมัติทุกหน้าที่ react-pdf ขึ้นหน้าใหม่จริงๆ
            (เดิมใช้วิธีตัดแบ่งเป็นก้อนตามจำนวนแถวเอง แต่ react-pdf ขึ้นหน้าใหม่ตามความสูงจริง
            ไม่ตรงกับที่กะไว้ ทำให้หัวตารางไม่ตรงจุดที่ขึ้นหน้าจริง ดูเหมือนตารางขาดหาย) */}
        <Text style={styles.sectionTitle} break>รายละเอียดการขาย{ZWJ}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            <Text style={[styles.th, { width: "20%" }]}>วันที่{ZWJ}</Text>
            <Text style={[styles.th, { width: "40%" }]}>รุ่นรถ{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "center" }]}>วิธีชำระ{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>ยอดขาย{ZWJ}</Text>
          </View>
          {detailRows.map((row, idx) => (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, { width: "20%" }]}>{sanitizeText(row.date)}{ZWJ}</Text>
              <Text style={[styles.td, { width: "40%" }]}>{sanitizeText(row.modelLabel)}{ZWJ}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "center" }]}>{sanitizeText(row.paymentLabel)}{ZWJ}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(row.amount)}</Text>
            </View>
          ))}
          <View style={styles.tableRowTotal} wrap={false}>
            <Text style={[styles.th, { width: "80%" }]}>รวม{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>
              {fmt(detailRows.reduce((s, r) => s + (r.amount || 0), 0))}
            </Text>
          </View>
        </View>

        {/* ลายเซ็นรับรอง */}
        <View style={styles.signSection} wrap={false}>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>ผู้จัดทำรายงาน{ZWJ}</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>ผู้มีอำ{ZWJ}นาจลงนาม{ZWJ}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}