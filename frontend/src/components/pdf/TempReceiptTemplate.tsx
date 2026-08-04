import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { registerFonts, sanitizeText, fmt } from "./Salereceiptutils";

registerFonts();

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: "Sarabun",
    fontSize: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  companyDetail: {
    fontSize: 8.5,
    marginTop: 2,
  },
  title: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 10,
    fontWeight: "bold",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  fieldLabel: {
    width: 55,
  },
  fieldValue: {
    flex: 1,
    borderBottom: "0.7pt dotted #000",
    paddingBottom: 1,
  },

  table: {
    marginTop: 10,
    border: "0.8pt solid #000",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "0.8pt solid #000",
    backgroundColor: "#f2f2f2",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #ccc",
    minHeight: 18,
  },
  colDesc: {
    flex: 1,
    padding: 4,
    borderRight: "0.8pt solid #000",
  },
  colAmount: {
    width: 90,
    padding: 4,
    textAlign: "right",
  },
  tableHeaderText: {
    fontSize: 9.5,
    fontWeight: "bold",
    textAlign: "center",
    padding: 4,
  },
  totalRow: {
    flexDirection: "row",
    borderTop: "0.8pt solid #000",
  },
  totalLabel: {
    flex: 1,
    padding: 4,
    textAlign: "right",
    fontWeight: "bold",
    borderRight: "0.8pt solid #000",
  },
  totalValue: {
    width: 90,
    padding: 4,
    textAlign: "right",
    fontWeight: "bold",
  },

  signSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  signBox: {
    width: "23%",
    alignItems: "center",
  },
  signLine: {
    borderBottom: "0.7pt dotted #000",
    width: "100%",
    marginBottom: 4,
    height: 14,
  },
  signLabel: {
    fontSize: 9,
  },
});

export interface TempReceiptItem {
  description: string;
  amount: number;
}

interface TempReceiptTemplateProps {
  receiptNumber: string; // e.g. "MO-00001"
  date: string; // e.g. "23/07/2569"
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  items: TempReceiptItem[];
  total: number;
}

const COMPANY_NAME = "นพดลมอเตอร์กรุ้ป";
const COMPANY_ADDRESS = "359/2 หมู่ 6 ตำบลร้องเข็ม อำเภอร้องกวาง จังหวัดแพร่  โทร. 099-376-8889";

const TempReceiptTemplate = ({
  receiptNumber,
  date,
  customerName,
  customerAddress,
  customerPhone,
  items,
  total,
}: TempReceiptTemplateProps) => {
  // เติมแถวว่างให้ตารางดูสมส่วน (อย่างน้อย 5 แถว เหมือนฟอร์มต้นแบบ)
  const rows = [...(items || [])];
  while (rows.length < 5) rows.push({ description: "", amount: 0 });

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.companyName}>{COMPANY_NAME}</Text>
          <Text style={styles.companyDetail}>{COMPANY_ADDRESS}</Text>
        </View>

        <Text style={styles.title}>ใบเสร็จรับเงินชั่วคราว</Text>

        {/* เลขที่ / วันที่ */}
        <View style={styles.topRow}>
          <Text>เลขที่ {receiptNumber}</Text>
          <Text>วันที่ {date}</Text>
        </View>

        {/* ชื่อ */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>ชื่อ</Text>
          <Text style={styles.fieldValue}>{sanitizeText(customerName)}</Text>
        </View>

        {/* ที่อยู่ */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>ที่อยู่</Text>
          <Text style={styles.fieldValue}>{sanitizeText(customerAddress || "")}</Text>
        </View>

        {/* โทรศัพท์ */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>โทรศัพท์</Text>
          <Text style={styles.fieldValue}>{sanitizeText(customerPhone || "")}</Text>
        </View>

        {/* ตารางรายการ */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDesc, styles.tableHeaderText]}>รายการ</Text>
            <Text style={[styles.colAmount, styles.tableHeaderText]}>จำนวนเงิน</Text>
          </View>
          {rows.map((row, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colDesc}>{sanitizeText(row.description)}</Text>
              <Text style={styles.colAmount}>{row.amount ? fmt(row.amount) : ""}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>รวม</Text>
            <Text style={styles.totalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* ลายเซ็น */}
        <View style={styles.signSection}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>ลูกค้า</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>ผู้ออกบิล</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>ผู้รับเงิน</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>ผู้อนุมัติ</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default TempReceiptTemplate;