"use client";

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Sarabun",
  fonts: [
    { src: "/fonts/Sarabun-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Sarabun-Bold.ttf", fontWeight: "bold" },
  ],
});
Font.registerHyphenationCallback((word: string) => [word]);

const ZWJ = "\u200D";

// ✅ ป้องกันตัวอักษรไทยบางตัวหายตอน render (บั๊ก react-pdf ที่เจอมาก่อนหน้า)
const safe = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return "-";
  return String(text)
    .split("")
    .join(ZWJ);
};

const COMPANY_NAME = "นพดลมอเตอร์กรุ้ป";
const COMPANY_ADDRESS = "359/2 หมู่ 6 ตำบลร้องเข็ม อำเภอร้องกวาง จังหวัดแพร่";
const COMPANY_PHONE = "โทร. 099-376-8889";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Sarabun",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
    borderBottom: "2pt solid #1a1a1a",
    paddingBottom: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 3,
  },
  companyDetail: {
    fontSize: 9,
    color: "#555",
    marginBottom: 1,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 10,
  },
  reportPeriod: {
    fontSize: 10,
    color: "#333",
    marginTop: 2,
  },
  reportDate: {
    fontSize: 8,
    color: "#888",
    marginTop: 4,
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

  // สรุปภาพรวม
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

  // ตาราง
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

const fmt = (n: number) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);

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
        {/* หัวรายงาน */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{safe(COMPANY_NAME)}</Text>
          <Text style={styles.companyDetail}>{safe(COMPANY_ADDRESS)}</Text>
          <Text style={styles.companyDetail}>{safe(COMPANY_PHONE)}</Text>
          <Text style={styles.reportTitle}>{safe("รายงานสรุปผลประกอบการทางการเงิน")}</Text>
          <Text style={styles.reportPeriod}>{safe(`ประจำ${periodLabel}`)}</Text>
        </View>

        <Text style={styles.reportDate}>{safe(`จัดทำรายงานวันที่ ${today}`)}</Text>

        {/* สรุปภาพรวม */}
        <Text style={styles.sectionTitle}>{safe("สรุปภาพรวม")}</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{safe("รายได้รวม")}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.total_revenue)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{safe("ต้นทุนรถ")}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.total_cost)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{safe("ต้นทุนของแถม")}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.total_additional_fees)}</Text>
          </View>
          <View style={[styles.summaryCell, { borderRight: "none" }]}>
            <Text style={styles.summaryLabel}>{safe("กำไรขั้นต้น")}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.gross_profit)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{safe("กำไรสุทธิ")}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.net_profit)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{safe("Profit Margin")}</Text>
            <Text style={styles.summaryValue}>{overview.profit_margin.toFixed(1)}%</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>{safe("จำนวนออเดอร์")}</Text>
            <Text style={styles.summaryValue}>{overview.total_orders}</Text>
          </View>
          <View style={[styles.summaryCell, { borderRight: "none" }]}>
            <Text style={styles.summaryLabel}>{safe("กำไรเฉลี่ย/ออเดอร์")}</Text>
            <Text style={styles.summaryValue}>{fmt(overview.average_profit_per_order)}</Text>
          </View>
        </View>

        {/* ตารางรายเดือน */}
        <Text style={styles.sectionTitle}>{safe("สรุปรายเดือน")}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: "20%" }]}>{safe("เดือน")}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{safe("รายได้")}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{safe("ต้นทุนรถ")}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{safe("ต้นทุนของแถม")}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{safe("กำไรสุทธิ")}</Text>
          </View>
          {monthlyData.map((row, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.td, { width: "20%" }]}>{safe(row.month)}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(row.revenue)}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(row.cost)}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(row.additional_fees)}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(row.net_profit)}</Text>
            </View>
          ))}
          <View style={styles.tableRowTotal}>
            <Text style={[styles.th, { width: "20%" }]}>{safe("รวม")}</Text>
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

        {/* ตารางรุ่นรถ */}
        <Text style={styles.sectionTitle}>{safe("สรุปตามรุ่นรถ")}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, { width: "30%" }]}>{safe("รุ่นรถ")}</Text>
            <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>{safe("จำนวนขาย")}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{safe("รายได้")}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{safe("ต้นทุนรถ")}</Text>
            <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>{safe("กำไร")}</Text>
          </View>
          {modelData.map((m, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.td, { width: "30%" }]}>{safe(m.model_name)}</Text>
              <Text style={[styles.td, { width: "15%", textAlign: "right" }]}>{m.count}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(m.revenue)}</Text>
              <Text style={[styles.td, { width: "20%", textAlign: "right" }]}>{fmt(m.cost)}</Text>
              <Text style={[styles.td, { width: "15%", textAlign: "right" }]}>{fmt(m.gross_profit)}</Text>
            </View>
          ))}
          <View style={styles.tableRowTotal}>
            <Text style={[styles.th, { width: "30%" }]}>{safe("รวม")}</Text>
            <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>{modelTotals.count}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{fmt(modelTotals.revenue)}</Text>
            <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>{fmt(modelTotals.cost)}</Text>
            <Text style={[styles.th, { width: "15%", textAlign: "right" }]}>{fmt(modelTotals.gross_profit)}</Text>
          </View>
        </View>

        {/* ลายเซ็นรับรอง */}
        <View style={styles.signSection}>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>{safe("ผู้จัดทำรายงาน")}</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>{safe("ผู้มีอำนาจลงนาม")}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}