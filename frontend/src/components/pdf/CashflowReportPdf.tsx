// CashflowReportPdf.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashflowReportPdf.tsx
"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CashflowMonthData } from "@/services/CashflowService";
import { UIRow, TYPE_LABEL, fmt, signedAmount, DayCashflowData } from "../util/cashflowUtil";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10 },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  table: { display: "flex", flexDirection: "column", borderWidth: 1, borderColor: "#ddd" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee" },
  headerRow: { flexDirection: "row", backgroundColor: "#f3f4f6", fontWeight: 700 },
  cell: { padding: 4, flex: 1 },
  cellRight: { padding: 4, flex: 1, textAlign: "right" },
  summaryBox: { marginTop: 10, padding: 8, backgroundColor: "#fff7ed", borderRadius: 4 },
});

const SectionTable = ({ title, rows, opening }: { title: string; rows: UIRow[]; opening: number }) => {
  let running = opening;
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={styles.cell}>รายการ</Text>
          <Text style={styles.cell}>ประเภท</Text>
          <Text style={styles.cellRight}>จำนวนเงิน</Text>
          <Text style={styles.cellRight}>คงเหลือ</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.cell}>ยอดยกมา</Text>
          <Text style={styles.cell}>-</Text>
          <Text style={styles.cellRight}>-</Text>
          <Text style={styles.cellRight}>{fmt(opening)}</Text>
        </View>
        {rows.map((r, i) => {
          running += signedAmount(r);
          return (
            <View style={styles.row} key={i}>
              <Text style={styles.cell}>{r.description}</Text>
              <Text style={styles.cell}>{TYPE_LABEL[r.type]}</Text>
              <Text style={styles.cellRight}>{fmt(r.amount)}</Text>
              <Text style={styles.cellRight}>{fmt(running)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

interface DailyReportPdfProps {
  date: string;
  cashRows: UIRow[];
  cashOpening: number;
  cashClosing: number;
  transferRows: UIRow[];
  transferOpening: number;
  transferClosing: number;
}

export const DailyReportPdf = ({
  date, cashRows, cashOpening, cashClosing, transferRows, transferOpening, transferClosing,
}: DailyReportPdfProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>รายงานรายรับ-รายจ่ายประจำวัน</Text>
      <Text style={styles.subtitle}>วันที่ {date}</Text>

      <SectionTable title="เงินสด" rows={cashRows} opening={cashOpening} />
      <SectionTable title="โอน" rows={transferRows} opening={transferOpening} />

      <View style={styles.summaryBox}>
        <Text>ยอดคงเหลือเงินสด: {fmt(cashClosing)} บาท</Text>
        <Text>ยอดคงเหลือโอน: {fmt(transferClosing)} บาท</Text>
        <Text style={{ fontWeight: 700, marginTop: 4 }}>
          รวมทั้งหมด: {fmt(cashClosing + transferClosing)} บาท
        </Text>
      </View>
    </Page>
  </Document>
);

interface MonthlyReportPdfProps {
  monthData: CashflowMonthData;
}

export const MonthlyReportPdf = ({ monthData }: MonthlyReportPdfProps) => {
  const cashNet =
    monthData.cashTotals.income - monthData.cashTotals.sent - monthData.cashTotals.expense -
    monthData.cashTotals.change - monthData.cashTotals.deposit_return + monthData.cashTotals.cash_in;
  const transferNet =
    monthData.transferTotals.income - monthData.transferTotals.sent - monthData.transferTotals.expense -
    monthData.transferTotals.change - monthData.transferTotals.deposit_return + monthData.transferTotals.cash_in;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>รายงานสรุปรายรับ-รายจ่ายรายเดือน</Text>
        <Text style={styles.subtitle}>เดือน {monthData.month}</Text>

        <View style={styles.summaryBox}>
          <Text>รวมสุทธิ (เงินสด): {fmt(cashNet)} บาท</Text>
          <Text>รวมสุทธิ (โอน): {fmt(transferNet)} บาท</Text>
        </View>

        <Text style={styles.sectionTitle}>ยอดคงเหลือรายวัน</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.cell}>วันที่</Text>
            <Text style={styles.cellRight}>คงเหลือเงินสด</Text>
            <Text style={styles.cellRight}>คงเหลือโอน</Text>
          </View>
          {monthData.days.map((d) => (
            <View style={styles.row} key={d.date}>
              <Text style={styles.cell}>{d.date}</Text>
              <Text style={styles.cellRight}>{fmt(d.cashClosing)}</Text>
              <Text style={styles.cellRight}>{fmt(d.transferClosing)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

interface RangeReportPdfProps {
  fromDate: string;
  toDate: string;
  days: DayCashflowData[];
}

export const RangeReportPdf = ({ fromDate, toDate, days }: RangeReportPdfProps) => {
  const netCash = days.reduce((sum, d) => sum + d.cashRows.reduce((s, r) => s + signedAmount(r), 0), 0);
  const netTransfer = days.reduce((sum, d) => sum + d.transferRows.reduce((s, r) => s + signedAmount(r), 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>รายงานรายรับ-รายจ่าย ช่วงวันที่เลือก</Text>
        <Text style={styles.subtitle}>{fromDate} ถึง {toDate}</Text>

        <View style={styles.summaryBox}>
          <Text>รวมสุทธิ (เงินสด): {fmt(netCash)} บาท</Text>
          <Text>รวมสุทธิ (โอน): {fmt(netTransfer)} บาท</Text>
        </View>

        <Text style={styles.sectionTitle}>ยอดคงเหลือรายวัน</Text>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.cell}>วันที่</Text>
            <Text style={styles.cellRight}>คงเหลือเงินสด</Text>
            <Text style={styles.cellRight}>คงเหลือโอน</Text>
          </View>
          {days.map((d) => (
            <View style={styles.row} key={d.date}>
              <Text style={styles.cell}>{d.date}</Text>
              <Text style={styles.cellRight}>{fmt(d.cashClosing)}</Text>
              <Text style={styles.cellRight}>{fmt(d.transferClosing)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};