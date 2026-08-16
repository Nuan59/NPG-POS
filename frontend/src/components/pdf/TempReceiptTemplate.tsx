"use client";

import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { sanitizeText, fmt } from "./Salereceiptutils";

Font.register({
  family: "Sarabun",
  fonts: [
    { src: "/fonts/Sarabun-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Sarabun-Bold.ttf", fontWeight: "bold" },
  ],
});
Font.registerHyphenationCallback((word: string) => [word]);

const COLOR_ORANGE = "#F36B21";
const COLOR_LIGHT_ORANGE = "#FDB99B";
const COLOR_BORDER = "#8B4513";
const ZWJ = "\u200D";

const styles = StyleSheet.create({
  page: {
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 25,
    fontFamily: "Sarabun",
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  logoContainer: {
    width: 60,
    height: 60,
    marginRight: 8,
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  companyInfo: {
    flex: 1,
    textAlign: "center",
    paddingTop: 4,
  },
  companyName: {
    fontSize: 11,
    marginBottom: 1,
  },
  companyDetail: {
    fontSize: 7.5,
    marginBottom: 0.5,
  },
  badgeContainer: {
    width: 55,
  },
  badge: {
    border: `2pt solid ${COLOR_ORANGE}`,
    borderRadius: 2,
    padding: 3,
  },
  badgeText: {
    fontSize: 9,
    color: COLOR_ORANGE,
    textAlign: "center",
    fontWeight: "bold",
  },
  titleBox: {
    border: `2pt solid ${COLOR_BORDER}`,
    borderRadius: 2,
    padding: 4,
    textAlign: "center",
    marginBottom: 5,
    alignSelf: "center",
  },
  title: {
    fontSize: 12,
  },

  customerSection: {
    flexDirection: "row",
    marginBottom: 4,
  },
  leftInfo: {
    width: "55%",
    paddingRight: 8,
  },
  rightInfo: {
    width: "45%",
    paddingLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
    fontSize: 9,
    alignItems: "flex-start",
  },
  infoLabel: {
    width: 60,
  },
  infoValue: {
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  rightInfoRow: {
    flexDirection: "row",
    marginBottom: 2,
    fontSize: 9,
  },
  rightInfoLabel: {
    width: 65,
  },
  rightInfoValue: {
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },

  table: {
    border: `1.5pt solid #000`,
    marginBottom: 5,
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLOR_LIGHT_ORANGE,
    padding: 3,
    borderBottom: `1.5pt solid #000`,
  },
  headerText: {
    fontSize: 8.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderBottom: `0.5pt solid #eee`,
    fontSize: 8.5,
    minHeight: 18,
  },
  colDesc: { width: "78%" },
  colAmount: { width: "22%", textAlign: "right" },

  totalRow: {
    flexDirection: "row",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderTop: `1.5pt solid #000`,
    fontSize: 9.5,
  },
  totalLabel: { width: "78%", textAlign: "right", fontWeight: "bold" },
  totalValue: { width: "22%", textAlign: "right", fontWeight: "bold" },

  signSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  signBox: {
    width: "22%",
    textAlign: "center",
  },
  signatureLine: {
    marginTop: 28,
    paddingTop: 3,
    borderTop: `1pt solid #000`,
    fontSize: 9,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
});

export interface TempReceiptItem {
  description: string;
  amount: number;
}

interface TempReceiptTemplateProps {
  receiptNumber: string;
  date: string;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  modelCode?: string;       // ✅ รุ่นรถ (รหัสโมเดล) - แสดงเป็นรายการแรกในตารางแทนช่องแยก
  chassisNumber?: string;   // ✅ เลขตัวถัง - แสดงเป็นรายการในตารางแทนช่องแยก
  paymentMethodLabel?: string;
  items: TempReceiptItem[];
  total: number;
}

const COMPANY_NAME = "นพดลมอเตอร์กรุ้ป";
const COMPANY_ADDRESS = "359/2 หมู่ 6 ตำบลร้องเข็ม อำเภอร้องกวาง จังหวัดแพร่";
const COMPANY_PHONE = "โทร. 099-376-8889";

export default function TempReceiptTemplate({
  receiptNumber,
  date,
  customerName,
  customerAddress,
  customerPhone,
  modelCode,
  chassisNumber,
  paymentMethodLabel,
  items,
  total,
}: TempReceiptTemplateProps) {
  // ✅ ย้ายรุ่นรถ(รหัสโมเดล)/เลขตัวถัง มาเป็นรายการแรกๆ ในตาราง แทนการโชว์เป็นช่องแยกด้านบน
  const vehicleInfoRows: TempReceiptItem[] = [];
  if (modelCode) {
    vehicleInfoRows.push({ description: `รุ่นรถ (รหัสรุ่น): ${modelCode}`, amount: 0 });
  }
  if (chassisNumber) {
    vehicleInfoRows.push({ description: `เลขตัวถัง: ${chassisNumber}`, amount: 0 });
  }

  const rows = [...vehicleInfoRows, ...(items || [])];
  while (rows.length < 3) rows.push({ description: "", amount: 0 });

  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src="/logo.png" style={styles.logo} />
          </View>

          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{COMPANY_NAME}{ZWJ}</Text>
            <Text style={styles.companyDetail}>{COMPANY_ADDRESS}{ZWJ}</Text>
            <Text style={styles.companyDetail}>{COMPANY_PHONE}</Text>
          </View>

          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ชั่วคราว</Text>
            </View>
          </View>
        </View>

        <View style={styles.titleBox}>
          <Text style={styles.title}>ใบเสร็{ZWJ}จรั{ZWJ}บเงิ{ZWJ}นชั่{ZWJ}วคราว</Text>
        </View>

        {/* เลขที่ / วันที่ */}
        <View style={styles.customerSection}>
          <View style={styles.leftInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>เลขที่{ZWJ}</Text>
              <View style={styles.infoValue}><Text>{receiptNumber}</Text></View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ชื่{ZWJ}อ</Text>
              <View style={styles.infoValue}><Text>{sanitizeText(customerName)}</Text></View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ที่{ZWJ}อยู่{ZWJ}</Text>
              <View style={styles.infoValue}><Text>{sanitizeText(customerAddress || "")}</Text></View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>โทรศั{ZWJ}พท์{ZWJ}</Text>
              <View style={styles.infoValue}><Text>{sanitizeText(customerPhone || "")}</Text></View>
            </View>
          </View>

          <View style={styles.rightInfo}>
            <View style={styles.rightInfoRow}>
              <Text style={styles.rightInfoLabel}>วั{ZWJ}นที่{ZWJ}</Text>
              <View style={styles.rightInfoValue}><Text>{date}</Text></View>
            </View>
            <View style={styles.rightInfoRow}>
              <Text style={styles.rightInfoLabel}>ชำ{ZWJ}าระโดย</Text>
              <View style={styles.rightInfoValue}><Text>{sanitizeText(paymentMethodLabel || "-")}</Text></View>
            </View>
          </View>
        </View>

        {/* ตารางรายการ */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDesc]}>รายการ</Text>
            <Text style={[styles.headerText, styles.colAmount]}>จำ{ZWJ}นวนเงิ{ZWJ}น</Text>
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
            <Text style={styles.signatureLine}>ลู{ZWJ}กค้{ZWJ}า</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signatureLine}>ผู้{ZWJ}ออกบิ{ZWJ}ล</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signatureLine}>ผู้{ZWJ}รั{ZWJ}บเงิ{ZWJ}น</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signatureLine}>ผู้{ZWJ}อนุ{ZWJ}มั{ZWJ}ติ{ZWJ}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}