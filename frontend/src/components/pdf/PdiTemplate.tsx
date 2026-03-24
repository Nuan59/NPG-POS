// PdiTemplate.tsx - สมดุลและเรียบง่าย
// วางไฟล์ที่: src/components/pdf/PdiTemplate.tsx

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: 'Sarabun',
  fonts: [
    {
      src: '/fonts/Sarabun-Regular.ttf',
      fontWeight: 'normal',
    },
    {
      src: '/fonts/Sarabun-Bold.ttf',
      fontWeight: 'bold',
    }
  ]
});

Font.registerHyphenationCallback((word: string) => [word]);

const ZWJ = "\u200D";

const styles = StyleSheet.create({
  page: {
    padding: 15,
    fontSize: 9,
    fontFamily: "Sarabun",
  },
  printBadge: {
    position: "absolute",
    top: 8,
    right: 12,
    border: "2px solid #ff6600",
    padding: "4 12",
    fontSize: 10,
    color: "#ff6600",
    fontWeight: "bold",
  },
  header: {
    textAlign: "center",
    marginTop: 10,
    marginBottom: 10,
    position: "relative",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
  },
  pdiBox: {
    position: "absolute",
    top: -8,
    right: 0,
    border: "2px solid black",
    padding: "4 12",
    fontSize: 9,
    fontWeight: "bold",
  },
  vehicleInfo: {
    border: "1px solid black",
    padding: 8,
    marginBottom: 0,
  },
  vehicleTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
    borderBottom: "1px solid black",
    paddingBottom: 3,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 3,
    fontSize: 9,
  },
  label: {
    width: 85,
    fontWeight: "bold",
  },
  value: {
    flex: 1,
    borderBottom: "0.5px solid #999",
    paddingLeft: 5,
    paddingVertical: 1,
  },
  checklist: {
    border: "1px solid black",
    flexDirection: "row",
    minHeight: 125,
  },
  column: {
    flex: 1,
    padding: 6,
  },
  columnBorder: {
    borderRight: "1px solid black",
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 3,
    paddingBottom: 2,
    borderBottom: "1px solid black",
  },
  checkboxItem: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "flex-start",
  },
  checkbox: {
    width: 8,
    height: 8,
    border: "1px solid black",
    borderRadius: 4,
    marginRight: 4,
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxLabel: {
    fontSize: 8,
    flex: 1,
    lineHeight: 1.3,
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
    paddingHorizontal: 30,
  },
  signatureBox: {
    width: 150,
    textAlign: "center",
  },
  signatureTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 25,
  },
  signatureLine: {
    borderTop: "1px solid black",
    marginBottom: 4,
  },
  signatureDate: {
    fontSize: 8,
    color: "#666",
  },
});

interface PdiTemplateProps {
  customerName: string;
  chassisNumber: string;
  engineNumber: string;
  model: string;
  color: string;
}

export default function PdiTemplate({
  customerName,
  chassisNumber,
  engineNumber,
  model,
  color,
}: PdiTemplateProps) {
  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>ใบตรวจเช็{ZWJ}คก่{ZWJ}อนส่{ZWJ}งมอบ / PDI</Text>
        </View>

        {/* ข้อมูลรถ */}
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>ข้อมู{ZWJ}ลรถ</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>หมายเลขตั{ZWJ}วถั{ZWJ}ง:</Text>
            <Text style={styles.value}>{chassisNumber || ""}{ZWJ}</Text>
            <Text style={[styles.label, { marginLeft: 15 }]}>รุ่{ZWJ}น:</Text>
            <Text style={styles.value}>{model || ""}{ZWJ}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>สี{ZWJ}:</Text>
            <Text style={styles.value}>{color || ""}{ZWJ}</Text>
            <Text style={[styles.label, { marginLeft: 15 }]}>หมายเลขเครื่{ZWJ}องยนต์{ZWJ}:</Text>
            <Text style={styles.value}>{engineNumber || ""}{ZWJ}</Text>
          </View>
        </View>

        {/* Checklist */}
        <View style={styles.checklist}>
          {/* คอลัมน์ซ้าย */}
          <View style={[styles.column, styles.columnBorder]}>
            <Text style={styles.sectionTitle}>สภาพการตรวจสอบภายนอก</Text>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>สภาพตั{ZWJ}วถั{ZWJ}ง สี{ZWJ}รถ อุ{ZWJ}ปกรณ์{ZWJ}ชิ้{ZWJ}นส่{ZWJ}วนต่{ZWJ}างๆ</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>การเปิ{ZWJ}ด-ปิ{ZWJ}ดเบาะนั่{ZWJ}ง</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>แฮนด์{ZWJ}บั{ZWJ}งคั{ZWJ}บเลี้{ZWJ}ยวปกติ ไม่{ZWJ}ฝื{ZWJ}ด ไม่{ZWJ}ติ{ZWJ}ดขั{ZWJ}ด</Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 6 }]}>การตรวจสอบก่อนสตาร์ท</Text>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ระดั{ZWJ}บน้ำ{ZWJ}มั{ZWJ}นเครื่{ZWJ}อง</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ระดั{ZWJ}บน้ำ{ZWJ}มั{ZWJ}นเฟื{ZWJ}องท้าย</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ระดั{ZWJ}บน้ำ{ZWJ}มั{ZWJ}นเบรคหน้า</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ระดั{ZWJ}บน้ำ{ZWJ}หล่{ZWJ}อเย็{ZWJ}น</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>สภาพยาง แรงดั{ZWJ}นลมล้{ZWJ}อหน้า-หลั{ZWJ}ง</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ไม่{ZWJ}มี{ZWJ}การรั่{ZWJ}วซึ{ZWJ}มของเหลว</Text>
            </View>
          </View>

          {/* คอลัมน์ขวา */}
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>การทำ{ZWJ}งานของอุ{ZWJ}ปกรณ์{ZWJ}ไฟฟ้า</Text>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ไฟเตื{ZWJ}อนต่{ZWJ}างๆ บนเรื{ZWJ}อนไมล์{ZWJ}</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ไฟท้ายและไฟเบรค</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ไฟหน้า (ไฟต่ำ{ZWJ}-ไฟสู{ZWJ}ง)</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ไฟเลี้{ZWJ}ยวซ้{ZWJ}ายและขวา</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>เสี{ZWJ}ยงแตร</Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 6 }]}>การให้{ZWJ}คำ{ZWJ}แนะนำ{ZWJ}</Text>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>สมุ{ZWJ}ดรั{ZWJ}บประกั{ZWJ}น</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>พรบ.</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ใบส่{ZWJ}งมอบสิ{ZWJ}นค้า</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ใบเสร็{ZWJ}จรั{ZWJ}บเงิ{ZWJ}น</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ป้ายแดง (ถ้า{ZWJ}มี{ZWJ})</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>ของแถม</Text>
            </View>
            
            <View style={styles.checkboxItem}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>สติ{ZWJ}กเกอร์{ZWJ}นั{ZWJ}ด 1,000 กม.</Text>
            </View>
          </View>
        </View>

        {/* ลายเซ็น */}
        <View style={styles.signatures}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>เจ้า{ZWJ}หน้า{ZWJ}ที่{ZWJ}ผู้{ZWJ}ตรวจสอบรถ</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureDate}>วั{ZWJ}นที่{ZWJ} ................................</Text>
          </View>
          
          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>ผู้{ZWJ}ส่{ZWJ}งมอบรถ</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureDate}>วั{ZWJ}นที่{ZWJ} ................................</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}