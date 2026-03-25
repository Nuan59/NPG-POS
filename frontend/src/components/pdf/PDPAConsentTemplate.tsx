
"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ลงทะเบียนฟอนต์ไทย Sarabun
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
    fontFamily: "Sarabun",
    fontSize: 8,
    paddingTop: 50,  // เพิ่มจาก 28 → 50 (เลื่อนลง)
    paddingBottom: 28,
    paddingLeft: 28,
    paddingRight: 28,
    lineHeight: 1.25,
  },
  
  header: {
    textAlign: "center",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: "2pt solid #000",
  },
  
  title: {
    fontSize: 11.5,
    fontWeight: "bold",
    marginBottom: 2,
  },
  
  subtitle: {
    fontSize: 8,
    color: "#666",
  },
  
  section: {
    marginBottom: 5,
  },
  
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 2.5,
    backgroundColor: "#f0f0f0",
    padding: 2,
    borderLeft: "3pt solid #F36B21",
    paddingLeft: 5,
  },
  
  text: {
    fontSize: 7.5,
    marginBottom: 2,
    textAlign: "justify",
  },
  
  bulletPoint: {
    fontSize: 7.5,
    marginLeft: 10,
    marginBottom: 1.5,
  },
  
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginLeft: 6,
  },
  
  checkbox: {
    width: 9,
    height: 9,
    border: "1pt solid #000",
    marginRight: 5,
  },
  
  checkboxText: {
    fontSize: 7.5,
    flex: 1,
  },
  
  customerInfo: {
    marginTop: 5,
    marginBottom: 5,
    padding: 7,
    backgroundColor: "#f9f9f9",
    border: "1pt solid #ddd",
    borderRadius: 2,
  },
  
  infoRow: {
    flexDirection: "row",
    marginBottom: 3.5,
  },
  
  infoLabel: {
    width: 70,
    fontSize: 7.5,
    fontWeight: "bold",
  },
  
  infoValue: {
    flex: 1,
    fontSize: 7.5,
    borderBottom: "1pt dotted #999",
    paddingBottom: 1,
  },
  
  signatureSection: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  
  signatureBox: {
    width: "35%",
    textAlign: "center",
  },
  
  signatureLine: {
    marginTop: 35,
    borderTop: "1pt solid #000",
    paddingTop: 3,
    fontSize: 8,
  },
  
  signatureLabel: {
    fontSize: 7,
    color: "#666",
    marginTop: 2,
  },
  
  footer: {
    marginTop: 8,
    paddingTop: 5,
    borderTop: "1pt solid #ddd",
    fontSize: 6.5,
    color: "#666",
  },
  
  consentBox: {
    marginTop: 6,
    marginBottom: 6,
    padding: 7,
    border: "2pt solid #F36B21",
    borderRadius: 2,
  },
  
  consentTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
    color: "#F36B21",
  },
});

interface PDPAConsentProps {
  customerName: string;
  address: string;
  phone: string;
}

export default function PDPAConsentTemplate({
  customerName,
  address,
  phone,
}: PDPAConsentProps) {
  const currentDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            หนั{ZWJ}งสื{ZWJ}อแจ้{ZWJ}งและขอความยิ{ZWJ}นยอมเกี่{ZWJ}ยวกั{ZWJ}บข้อมู{ZWJ}ลส่{ZWJ}วนบุ{ZWJ}คคล
          </Text>
          <Text style={styles.subtitle}>
            Personal Data Protection Notice and Consent
          </Text>
        </View>

        {/* คำนำ */}
        <View style={styles.section}>
          <Text style={styles.text}>
            เรี{ZWJ}ยน ท่{ZWJ}านลู{ZWJ}กค้า
          </Text>
          <Text style={styles.text}>
            ห้างหุ้{ZWJ}นส่{ZWJ}วนจำ{ZWJ}กั{ZWJ}ด นพดลมอเตอร์{ZWJ}กรุ้{ZWJ}ป (&quot;ห้างฯ&quot;) ให้{ZWJ}ความสำ{ZWJ}คั{ZWJ}ญกั{ZWJ}บการคุ้{ZWJ}มครองข้อมู{ZWJ}ล
            ส่{ZWJ}วนบุ{ZWJ}คคลของท่{ZWJ}าน จึ{ZWJ}งขอแจ้{ZWJ}งรายละเอี{ZWJ}ยดและขอความยิ{ZWJ}นยอมดั{ZWJ}งต่{ZWJ}อไปนี้{ZWJ}:
          </Text>
        </View>

        {/* 1. ข้อมูลที่เก็บรวบรวม */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            1. ข้อมู{ZWJ}ลที่{ZWJ}เก็{ZWJ}บรวบรวม
          </Text>
          <Text style={styles.bulletPoint}>• ชื่{ZWJ}อ-นามสกุ{ZWJ}ล</Text>
          <Text style={styles.bulletPoint}>• ที่{ZWJ}อยู่{ZWJ}</Text>
          <Text style={styles.bulletPoint}>• เบอร์{ZWJ}โทรศั{ZWJ}พท์{ZWJ}</Text>
          <Text style={styles.bulletPoint}>• ข้อมู{ZWJ}ลการซื้{ZWJ}อสิ{ZWJ}นค้า (รุ่{ZWJ}นรถ, หมายเลขตั{ZWJ}วถั{ZWJ}ง, หมายเลขเครื่{ZWJ}อง)</Text>
          <Text style={styles.bulletPoint}>• ข้อมู{ZWJ}ลการชำ{ZWJ}ระเงิ{ZWJ}น</Text>
        </View>

        {/* 2. วัตถุประสงค์ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            2. วั{ZWJ}ตถุ{ZWJ}ประสงค์{ZWJ}ในการใช้{ZWJ}ข้อมู{ZWJ}ล
          </Text>
          <Text style={styles.bulletPoint}>• เพื่{ZWJ}อติ{ZWJ}ดต่{ZWJ}อและส่{ZWJ}งมอบสิ{ZWJ}นค้า</Text>
          <Text style={styles.bulletPoint}>• เพื่{ZWJ}อออกเอกสารการขาย</Text>
          <Text style={styles.bulletPoint}>• เพื่{ZWJ}อการบริ{ZWJ}การหลั{ZWJ}งการขาย และการรั{ZWJ}บประกั{ZWJ}นสิ{ZWJ}นค้า</Text>
          <Text style={styles.bulletPoint}>• เพื่{ZWJ}อการวิ{ZWJ}เคราะห์{ZWJ}พื้{ZWJ}นที่{ZWJ}การตลาดและพฤติ{ZWJ}กรรมผู้{ZWJ}บริ{ZWJ}โภค</Text>
          <Text style={styles.bulletPoint}>• เพื่{ZWJ}อปรั{ZWJ}บปรุ{ZWJ}งคุ{ZWJ}ณภาพการให้{ZWJ}บริ{ZWJ}การและพั{ZWJ}ฒนาผลิ{ZWJ}ตภั{ZWJ}ณฑ์{ZWJ}</Text>
          <Text style={styles.bulletPoint}>• เพื่{ZWJ}อแจ้{ZWJ}งข้อมู{ZWJ}ลโปรโมชั่{ZWJ}น ข่{ZWJ}าวสาร และสิ{ZWJ}ทธิ{ZWJ}พิ{ZWJ}เศษ</Text>
          <Text style={styles.bulletPoint}>• เพื่{ZWJ}อปฏิ{ZWJ}บั{ZWJ}ติ{ZWJ}ตามกฎหมาย และข้อกำ{ZWJ}หนดของหน่{ZWJ}วยงานราชการ</Text>
        </View>

        {/* 3. ระยะเวลา */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            3. ระยะเวลาในการเก็{ZWJ}บรั{ZWJ}กษาข้อมู{ZWJ}ล
          </Text>
          <Text style={styles.text}>
            ห้างฯ จะเก็{ZWJ}บข้อมู{ZWJ}ลของท่{ZWJ}านเป็{ZWJ}นระยะเวลา 5 ปี{ZWJ} นั{ZWJ}บจากวั{ZWJ}นทำ{ZWJ}ธุ{ZWJ}รกรรม
            หรื{ZWJ}อตามที่{ZWJ}กฎหมายกำ{ZWJ}หนด
          </Text>
        </View>

        {/* 4. การเปิดเผย */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            4. การเปิ{ZWJ}ดเผยข้อมู{ZWJ}ลแก่{ZWJ}บุ{ZWJ}คคลที่{ZWJ}สาม
          </Text>
          <Text style={styles.text}>
            ห้างฯ จะไม่{ZWJ}เปิ{ZWJ}ดเผยข้อมู{ZWJ}ลของท่{ZWJ}านแก่{ZWJ}บุ{ZWJ}คคลภายนอก ยกเว้{ZWJ}น:
          </Text>
          <Text style={styles.bulletPoint}>• บริ{ZWJ}ษั{ZWJ}ทขนส่{ZWJ}ง</Text>
          <Text style={styles.bulletPoint}>• หน่{ZWJ}วยงานราชการ (เมื่{ZWJ}อมี{ZWJ}คำ{ZWJ}สั่{ZWJ}งตามกฎหมาย)</Text>
        </View>

        {/* 5. สิทธิ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            5. สิ{ZWJ}ทธิ{ZWJ}ของเจ้{ZWJ}าของข้อมู{ZWJ}ล
          </Text>
          <Text style={styles.text}>ท่{ZWJ}านมี{ZWJ}สิ{ZWJ}ทธิ{ZWJ}:</Text>
          <Text style={styles.bulletPoint}>• ขอเข้าถึ{ZWJ}งและขอสำ{ZWJ}เนาข้อมู{ZWJ}ลส่{ZWJ}วนบุ{ZWJ}คคล</Text>
          <Text style={styles.bulletPoint}>• ขอแก้{ZWJ}ไขข้อมู{ZWJ}ลให้{ZWJ}ถู{ZWJ}กต้อง</Text>
          <Text style={styles.bulletPoint}>• ขอลบหรื{ZWJ}อทำ{ZWJ}ลายข้อมู{ZWJ}ล</Text>
          <Text style={styles.bulletPoint}>• ขอระงั{ZWJ}บการใช้{ZWJ}ข้อมู{ZWJ}ล</Text>
          <Text style={styles.bulletPoint}>• ถอนความยิ{ZWJ}นยอม (กรณี{ZWJ}ส่{ZWJ}งการตลาด)</Text>
          <Text style={styles.text}>
            ติ{ZWJ}ดต่{ZWJ}อ: 099-376-8889 หรื{ZWJ}อ ที่{ZWJ}ร้านนพดลมอเตอร์{ZWJ}กรุ้{ZWJ}ป
          </Text>
        </View>

        {/* ข้อมูลลูกค้า */}
        <View style={styles.consentBox}>
          <Text style={styles.consentTitle}>ความยิ{ZWJ}นยอมของลู{ZWJ}กค้า</Text>
          
          <View style={styles.customerInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ชื่{ZWJ}อ-นามสกุ{ZWJ}ล:</Text>
              <Text style={styles.infoValue}>{customerName}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ที่{ZWJ}อยู่{ZWJ}:</Text>
              <Text style={styles.infoValue}>{address}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>โทร:</Text>
              <Text style={styles.infoValue}>{phone}</Text>
            </View>
          </View>

          {/* Consent Checkboxes */}
          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxText}>
              ยิ{ZWJ}นยอม ให้{ZWJ}ห้างหุ้{ZWJ}นส่{ZWJ}วนจำ{ZWJ}กั{ZWJ}ด นพดลมอเตอร์{ZWJ}กรุ้{ZWJ}ป เก็{ZWJ}บรวบรวม ใช้{ZWJ} และเปิ{ZWJ}ดเผย
              ข้อมู{ZWJ}ลส่{ZWJ}วนบุ{ZWJ}คคลตามวั{ZWJ}ตถุ{ZWJ}ประสงค์{ZWJ}ข้างต้น
            </Text>
          </View>

          <View style={styles.checkboxRow}>
            <View style={styles.checkbox} />
            <Text style={styles.checkboxText}>
              ยิ{ZWJ}นยอม ให้{ZWJ}ส่{ZWJ}งข้อมู{ZWJ}ลข่{ZWJ}าวสาร โปรโมชั่{ZWJ}น และสิ{ZWJ}ทธิ{ZWJ}พิ{ZWJ}เศษ
              ผ่{ZWJ}านทาง SMS / โทรศั{ZWJ}พท์{ZWJ} / Line
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>ลู{ZWJ}กค้า</Text>
            <Text style={styles.signatureLabel}>
              วั{ZWJ}นที่{ZWJ} _____ / _____ / _________
            </Text>
          </View>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureLine}>เจ้{ZWJ}าหน้าที่{ZWJ}</Text>
            <Text style={styles.signatureLabel}>
              วั{ZWJ}นที่{ZWJ} _____ / _____ / _________
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={{ fontWeight: "bold", marginBottom: 2 }}>หมายเหตุ{ZWJ}:</Text>
          <Text style={{ marginBottom: 1.5 }}>
            • ท่{ZWJ}านมี{ZWJ}สิ{ZWJ}ทธิ์{ZWJ}ปฏิ{ZWJ}เสธหรื{ZWJ}อถอนความยิ{ZWJ}นยอมได้{ZWJ}ทุ{ZWJ}กเมื่{ZWJ}อ โดยแจ้{ZWJ}งเป็{ZWJ}นลายลั{ZWJ}กษณ์{ZWJ}อั{ZWJ}กษรมายั{ZWJ}งห้างฯ
          </Text>
          <Text style={{ marginBottom: 1.5 }}>
            • การปฏิ{ZWJ}เสธหรื{ZWJ}อถอนความยิ{ZWJ}นยอมอาจส่{ZWJ}งผลต่{ZWJ}อการให้{ZWJ}บริ{ZWJ}การบางประการ เช่{ZWJ}น การจั{ZWJ}ดส่{ZWJ}ง การติ{ZWJ}ดต่{ZWJ}อสื่{ZWJ}อสาร หรื{ZWJ}อการรั{ZWJ}บข้อเสนอพิ{ZWJ}เศษ
          </Text>
          <Text style={{ marginBottom: 1.5 }}>
            • ห้างฯ ขอสงวนสิ{ZWJ}ทธิ์{ZWJ}ในการปรั{ZWJ}บปรุ{ZWJ}งนโยบายความเป็{ZWJ}นส่{ZWJ}วนตั{ZWJ}วนี้{ZWJ} โดยจะแจ้{ZWJ}งให้{ZWJ}ท่{ZWJ}านทราบล่{ZWJ}วงหน้า
          </Text>
          <Text style={{ marginTop: 5, textAlign: "center", fontWeight: "bold", fontSize: 7 }}>
            เอกสารนี้{ZWJ}ออกวั{ZWJ}นที่{ZWJ} {currentDate}
          </Text>
          <Text style={{ textAlign: "center", fontSize: 6.5, marginTop: 1.5 }}>
            ห้างหุ้{ZWJ}นส่{ZWJ}วนจำ{ZWJ}กั{ZWJ}ด นพดลมอเตอร์{ZWJ}กรุ้{ZWJ}ป • โทร. 099-376-8889
          </Text>
        </View>
      </Page>
    </Document>
  );
}