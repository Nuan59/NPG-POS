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

  // ✅ หัวกระดาษแบบเดียวกับใบเสร็จ (โลโก้ + ชื่อบริษัท)
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottom: "2pt solid #1a1a1a",
    paddingBottom: 12,
    marginBottom: 16,
  },
  logoContainer: {
    width: 55,
    height: 55,
    marginRight: 10,
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  companyDetail: {
    fontSize: 8.5,
    color: "#444",
    marginBottom: 1,
  },

  titleBlock: {
    textAlign: "center",
    marginBottom: 14,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  reportPeriod: {
    fontSize: 10,
    color: "#333",
    marginTop: 2,
  },
  reportDate: {
    fontSize: 8,
    color: "#888",
    marginBottom: 10,
    textAlign: "right",
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 6,
    borderLeft: "3pt solid #1a1a1a",
    paddingLeft: 6,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    border: "1pt solid #ccc",
  },
  summaryCell: {
    width: "25%",
    padding: 8,
    borderRight: "1pt solid #ccc",
    borderBottom: "1pt solid #ccc",
  },
  summaryLabel: {
    fontSize: 8,
    color: "#666",
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "bold",
  },

  table: {
    border: "1pt solid #999",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#e5e5e5",
    borderBottom: "1pt solid #999",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #ddd",
  },
  tableRowTotal: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderTop: "1pt solid #999",
  },
  th: {
    padding: 5,
    fontSize: 8.5,
    fontWeight: "bold",
  },
  td: {
    padding: 5,
    fontSize: 8.5,
  },

  signSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 50,
  },
  signBox: {
    width: "35%",
    textAlign: "center",
  },
  signLine: {
    marginTop: 30,
    paddingTop: 4,
    borderTop: "1pt solid #000",
    fontSize: 9,
  },
});

type FinancialData = {
  year: string | number;
  month: string;
  revenue: number;
  cost: number;
  additional_fees: number;
  gross_profit: number;
  net_profit: number;
  order_count: number;
};

type ModelData = {
  model_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
  count: number;
};

type OverviewData = {
  total_revenue: number;
  total_cost: number;
  total_additional_fees: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  total_orders: number;
  average_profit_per_order: number;
};

interface FinancialReportPDFProps {
  overview: OverviewData;
  monthlyData: FinancialData[];
  modelData: ModelData[];
  periodLabel: string;
}

const today = new Date().toLocaleDateString("th-TH", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default function FinancialReportPDF({
  overview,
  monthlyData,
  modelData,
  periodLabel,
}: FinancialReportPDFProps) {
  const modelTotals = modelData.reduce(
    (acc, m) => {
      acc.count += m.count;
      acc.revenue += m.revenue;
      acc.cost += m.cost;
      acc.gross_profit += m.gross_profit;
      return acc;
    },
    { count: 0, revenue: 0, cost: 0, gross_profit: 0 }
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ✅ หัวกระดาษแบบเดียวกับใบเสร็จ */}
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
          <Text style={styles.reportTitle}>รายงานสรุปผลประกอบการทางการเงิน{ZWJ}</Text>
          <Text style={styles.reportPeriod}>{sanitizeText(`ประจำ${periodLabel}`)}{ZWJ}</Text>
        </View>

        <Text style={styles.reportDate}>{sanitizeText(`จัดทำรายงานวันที่ ${today}`)}{ZWJ}</Text>

        {/* สรุปภาพรวม */}
        <Text style={styles.sectionTitle}>สรุปภาพรวม{ZWJ}</Text>
        <View style={styles.summaryGrid} wrap={false}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>รายได้รวม{ZWJ}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.total_revenue)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>ต้นทุนรถ{ZWJ}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.total_cost)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>ต้นทุนของแถม{ZWJ}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.total_additional_fees)}</Text>
          </View>
          <View style={[styles.summaryCell, { borderRight: "none" }]}>
            <Text style={styles.summaryLabel}>กำไรขั้นต้น{ZWJ}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.gross_profit)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>กำไรสุทธิ{ZWJ}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.net_profit)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Profit Margin{ZWJ}</Text>
            <Text style={styles.summaryValue}>{overview.profit_margin.toFixed(1)}%</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>จำ{ZWJ}นวนออเดอร์{ZWJ}</Text>
            <Text style={styles.summaryValue}>{overview.total_orders}</Text>
          </View>
          <View style={[styles.summaryCell, { borderRight: "none" }]}>
            <Text style={styles.summaryLabel}>กำไรเฉลี่ย/ออเดอร์{ZWJ}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.average_profit_per_order)}</Text>
          </View>
        </View>

        {/* ตารางรายเดือน - wrap={false} ทุกแถว กันแถวขาดครึ่งเวลาขึ้นหน้าใหม่ */}
        <Text style={styles.sectionTitle}>สรุปรายเดือน{ZWJ}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow} wrap={false}>
            <Text style={[styles.th, { width: "20%" }]}>เดือน{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>รายได้{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>ต้นทุนรถ{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>ต้นทุนของแถม{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>กำไรสุทธิ{ZWJ}</Text>
          </View>
          {monthlyData.map((row, idx) => (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, { width: "20%" }]}>{sanitizeText(row.month)}{ZWJ}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(row.revenue)}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(row.cost)}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(row.additional_fees)}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(row.net_profit)}</Text>
            </View>
          ))}
          <View style={styles.tableRowTotal} wrap={false}>
            <Text style={[styles.th, { width: "20%" }]}>รวม{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>
              {fmt(monthlyData.reduce((s, r) => s + (r.revenue || 0), 0))}
            </Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>
              {fmt(monthlyData.reduce((s, r) => s + (r.cost || 0), 0))}
            </Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>
              {fmt(monthlyData.reduce((s, r) => s + (r.additional_fees || 0), 0))}
            </Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>
              {fmt(monthlyData.reduce((s, r) => s + (r.net_profit || 0), 0))}
            </Text>
          </View>
        </View>

        {/* ตารางรุ่นรถ - wrap={false} ทุกแถวเช่นกัน */}
        <Text style={styles.sectionTitle}>สรุปตามรุ่นรถ{ZWJ}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow} wrap={false}>
            <Text style={[styles.th, { width: "30%" }]}>รุ่นรถ{ZWJ}</Text>
            <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>จำ{ZWJ}นวนขาย{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>รายได้{ZWJ}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>ต้นทุนรถ{ZWJ}</Text>
            <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>กำไร{ZWJ}</Text>
          </View>
          {modelData.map((m, idx) => (
            <View key={idx} style={styles.tableRow} wrap={false}>
              <Text style={[styles.td, { width: "30%" }]}>{sanitizeText(m.model_name)}{ZWJ}</Text>
              <Text style={[styles.td, { width: "15%", textAlign: "right" }]}>{m.count}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(m.revenue)}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(m.cost)}</Text>
              <Text style={[styles.td, { width: "15%", textAlign: "right" }]}>{fmt(m.gross_profit)}</Text>
            </View>
          ))}
          <View style={styles.tableRowTotal} wrap={false}>
            <Text style={[styles.th, { width: "30%" }]}>รวม{ZWJ}</Text>
            <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>{modelTotals.count}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{fmt(modelTotals.revenue)}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{fmt(modelTotals.cost)}</Text>
            <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>{fmt(modelTotals.gross_profit)}</Text>
          </View>
        </View>

        {/* ลายเซ็นรับรอง - wrap={false} กันฉีกออกจากตารางสุดท้าย */}
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