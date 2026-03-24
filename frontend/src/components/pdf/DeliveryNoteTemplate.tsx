"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ✅ ใช้ Sarabun (มีอยู่แล้วใน public/fonts)
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

// ปิด hyphenation เพื่อไม่ให้ตัดคำผิด
Font.registerHyphenationCallback((word: string) => [word]);

// ✅ ใช้สีเดียวกับใบเสร็จ
const COLOR_ORANGE = "#F36B21";
const COLOR_LIGHT_ORANGE = "#FDB99B";
const COLOR_BORDER = "#8B4513";

// ✅ Zero Width Joiner - ใช้แก้ปัญหาตัวอักษรหาย
const ZWJ = "\u200D";

const styles = StyleSheet.create({
  page: {
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 25,
    fontFamily: "Sarabun",
    fontSize: 10,
  },

  // Header
  header: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },

  logoContainer: {
    width: 65,
    height: 65,
    marginRight: 8,
  },

  logo: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
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
    fontWeight: 'bold',
  },

  // Title - เหมือนใบเสร็จ
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

  // ✅ "ต้นฉบับ" badge
  originalBadge: {
    position: 'absolute',
    top: 15,
    right: 80,
    border: `2pt solid ${COLOR_ORANGE}`,
    borderRadius: 2,
    padding: 4,
    backgroundColor: '#fff',
  },

  originalText: {
    fontSize: 9,
    color: COLOR_ORANGE,
    fontWeight: 'bold',
  },

  // Customer Info - layout เหมือนใบเสร็จ
  customerSection: {
    flexDirection: "row",
    marginBottom: 4,
  },

  leftInfo: {
    width: "60%",
    paddingRight: 8,
  },

  rightInfo: {
    width: "40%",
    paddingLeft: 8,
  },

  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
    fontSize: 9,
    alignItems: "flex-start",
  },

  infoLabel: {
    width: 55,
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
    justifyContent: "flex-end",
  },

  rightInfoLabel: {
    width: 45,
    textAlign: "right",
    marginRight: 5,
  },

  rightInfoValue: {
    width: 100,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },

  // Table - สไตล์เดียวกับใบเสร็จ
  table: {
    border: `1.5pt solid #000`,
    marginBottom: 5,
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
    minHeight: 20,
  },

  col1: { width: "8%", textAlign: "center" },
  col2: { width: "25%" },
  col3: { width: "25%" },
  col4: { width: "25%" },
  col5: { width: "17%", textAlign: "center" },

  // Note - สไตล์ box เหมือนใบเสร็จ
  noteBox: {
    marginTop: 4,
    padding: 5,
    backgroundColor: "#fffef7",
    border: `1pt solid ${COLOR_LIGHT_ORANGE}`,
    borderRadius: 2,
  },

  noteTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    marginBottom: 2,
    color: COLOR_ORANGE,
  },

  noteText: {
    fontSize: 6.5,
    lineHeight: 1.2,
  },

  // Footer - ลายเซ็นใหญ่ขึ้น
  footer: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-around",
  },

  signatureBox: {
    width: "30%",
    textAlign: "center",
  },

  signatureLine: {
    marginTop: 40,
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

interface Vehicle {
  brand: string;
  model: string;
  modelCode: string;
  engineNo: string;
  frameNo: string;
  color: string;
}

interface Props {
  customerName: string;
  address: string;
  phone: string;
  date: string;
  vehicles: Vehicle[];
}

export default function DeliveryNoteTemplate({
  customerName,
  address,
  phone,
  date,
  vehicles,
}: Props) {
  return (
    <Document>
      <Page size="A5" orientation="landscape" style={styles.page}>
        {/* Header - เหมือนใบเสร็จ */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src="/logo.png" style={styles.logo} />
          </View>
          
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>นพดลมอเตอร์กรุ้ป</Text>
            <Text style={styles.companyDetail}>
              359/2 หมู{ZWJ}่ 6 ตำ{ZWJ}าบลร้องเข็ม อำ{ZWJ}าเภอร้องกวาง จั{ZWJ}งหวั{ZWJ}ดแพร่
            </Text>
            <Text style={styles.companyDetail}>โทร. 099-376-8889</Text>
          </View>

          {/* ✅ "ต้นฉบับ" badge - ไม่มีวันที่ */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ต้นฉบับ</Text>
            </View>
          </View>
        </View>

        {/* Title - เหมือนใบเสร็จ */}
        <View style={styles.titleBox}>
          <Text style={styles.title}>ใบส่{ZWJ}งมอบสิ{ZWJ}นค้า</Text>
        </View>

        {/* Customer Info - layout เหมือนใบเสร็จ */}
        <View style={styles.customerSection}>
          <View style={styles.leftInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>นาม</Text>
              <View style={styles.infoValue}>
                <Text>{customerName}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ที่{ZWJ}อยู่{ZWJ}</Text>
              <View style={styles.infoValue}>
                <Text>{address}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>โทรศั{ZWJ}พท์{ZWJ}</Text>
              <View style={styles.infoValue}>
                <Text>{phone}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.rightInfo}>
            <View style={styles.rightInfoRow}>
              <Text style={styles.rightInfoLabel}>วั{ZWJ}นที่{ZWJ}</Text>
              <View style={styles.rightInfoValue}>
                <Text>{date}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Table - สไตล์เดียวกับใบเสร็จ */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.col1]}>ลำ{ZWJ}าดั{ZWJ}บ</Text>
            <Text style={[styles.headerText, styles.col2]}>รหั{ZWJ}สรุ่{ZWJ}น</Text>
            <Text style={[styles.headerText, styles.col3]}>เลขตั{ZWJ}วเครื่{ZWJ}อง</Text>
            <Text style={[styles.headerText, styles.col4]}>เลขตั{ZWJ}วถั{ZWJ}ง</Text>
            <Text style={[styles.headerText, styles.col5]}>สี{ZWJ}</Text>
          </View>

          {/* Body - แสดงรถทั้งหมด */}
          {vehicles.map((vehicle, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.col1}>{idx + 1}{ZWJ}</Text>
              <Text style={styles.col2}>{vehicle.modelCode}{ZWJ}</Text>
              <Text style={styles.col3}>{vehicle.engineNo}{ZWJ}</Text>
              <Text style={styles.col4}>{vehicle.frameNo}{ZWJ}</Text>
              <Text style={styles.col5}>{vehicle.color}{ZWJ}</Text>
            </View>
          ))}

          {/* Empty rows - ขั้นต่ำ 3 แถว */}
          {vehicles.length < 3 &&
            Array.from({ length: 3 - vehicles.length }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.tableRow}>
                <Text style={styles.col1}> </Text>
                <Text style={styles.col2}> </Text>
                <Text style={styles.col3}> </Text>
                <Text style={styles.col4}> </Text>
                <Text style={styles.col5}> </Text>
              </View>
            ))}
        </View>

        {/* Note - box สไตล์เดียวกับใบเสร็จ */}
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>หมายเหตุ{ZWJ}:</Text>
          <Text style={styles.noteText}>
            ผู้รับสินค้าได้รับสินค้าและของแถมเรียบร้อยครบถ้วนจึงได้ลงนามในใบรับสินค้านี้ไว้ให้เป็นหลักฐานสำคัญ </Text>
          <Text style={styles.noteText}> 
            หากเกิดการสูญหายหรือเสียหาย ทางห้างฯ จะไม่รับผิดชอบไม่ว่ากรณีใดทั้งสิ้น{ZWJ}
          </Text>
        </View>

        {/* Signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>ผู้{ZWJ}รั{ZWJ}บสิ{ZWJ}นค้า</Text>
            <Text style={styles.signatureLabel}>วั{ZWJ}นที่{ZWJ} _______________</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>ผู้{ZWJ}ส่{ZWJ}งมอบ</Text>
            <Text style={styles.signatureLabel}>วั{ZWJ}นที่{ZWJ} _______________</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>ผู้{ZWJ}อนุ{ZWJ}มั{ZWJ}ติ{ZWJ}</Text>
            <Text style={styles.signatureLabel}>วั{ZWJ}นที่{ZWJ} _______________</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}