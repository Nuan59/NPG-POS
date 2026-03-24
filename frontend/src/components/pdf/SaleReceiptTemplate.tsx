import React from "react";
import { Document, Page, Text, View, Image } from "@react-pdf/renderer";
import { IOrder } from "@/types/Order";
import { styles } from "./Salereceiptstyles";
import {
  registerFonts,
  ZWJ,
  sanitizeText,
  numberToThaiText,
  fmt,
  getCustomerField,
  buildFullAddress,
  isPaymentMethod,
} from "./Salereceiptutils";

registerFonts();

interface CustomerData {
  name?: string;
  address?: string;
  phone?: string;
  [key: string]: any;
}

interface Props {
  order: IOrder;
  customer?: CustomerData;
}

// ============================
// Sub-component: ใบเสร็จ 1 ใบ
// ============================
const ReceiptPage: React.FC<{
  order: IOrder;
  customerData?: CustomerData;
  badgeLabel: string;
}> = ({ order, customerData, badgeLabel }) => {

  let bike: any = null;
  if (order.bikes && Array.isArray(order.bikes) && order.bikes.length > 0) {
    bike = order.bikes[0];
  } else if (order.bike) {
    bike = order.bike;
  }

  let documentNo = "-";
  if (order.id) documentNo = "PH-" + String(order.id).padStart(8, '0');
  else if (order.po_number) documentNo = sanitizeText(order.po_number);
  else if (order.order_id) documentNo = "PH-" + String(order.order_id).padStart(8, '0');

  const orderDate = order.sale_date
    ? new Date(order.sale_date)
    : order.order_date
      ? new Date(order.order_date)
      : new Date();

  let formattedDate = "-";
  try {
    formattedDate = orderDate.toLocaleDateString("th-TH", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch (e) {
    formattedDate = orderDate.toLocaleDateString();
  }

  const customerName = getCustomerField('name', order, customerData) || "ไม่ระบุชื่อ";
  const customerAddress = buildFullAddress(order, customerData);
  const customerPhone = getCustomerField('phone', order, customerData) || "ไม่ระบุเบอร์";

  // ✅ ตรวจสอบว่าเป็นไฟแนนซ์หรือไม่ (รองรับทุก finance provider)
  const isFinance = Boolean(
    order.finance_provider && 
    order.finance_provider.trim() !== "" && 
    order.finance_provider !== "เงินสด"
  ) || 
  isPaymentMethod("finance", order) || 
  isPaymentMethod("npg", order) ||
  ["ทรัพย์สยาม", "Cathay", "NPG", "ไฟแนนซ์"].includes(String(order.payment_method || "").trim());
  
  // Debug
  console.log('=== Receipt Debug ===');
  console.log('payment_method:', order.payment_method);
  console.log('payment_type:', order.payment_type);
  console.log('finance_provider:', order.finance_provider);
  console.log('isFinance:', isFinance);
  
  // ✅ ถ้าเป็นไฟแนนซ์ใช้ down_payment, ถ้าเป็นเงินสดใช้ sale_price
  const salePrice = isFinance 
    ? Number(order.down_payment || 0)
    : Number(order.sale_price || bike?.sale_price || 0);
    
  let additionalFeesTotal = 0;
  if (order.additional_fees && Array.isArray(order.additional_fees)) {
    additionalFeesTotal = order.additional_fees.reduce(
      (sum: number, fee: any) => sum + (Number(fee.amount) || 0), 0
    );
  }
  const totalAmount = salePrice + additionalFeesTotal;
  const deposit = Number(order.deposit || 0);
  const discount = Number(order.discount || 0);
  const afterDeposit = Math.max(0, totalAmount - deposit);
  const netTotal = Math.max(0, afterDeposit - discount);
  const totalInWords = numberToThaiText(netTotal);
  const isPayment = (method: string) => isPaymentMethod(method, order);
  
  // ✅ ฟังก์ชันตรวจสอบ payment_type
  const isPaymentType = (type: string): boolean => {
    const pt = String(order.payment_type || "").trim();
    const checkType = String(type).trim();
    
    // ตรวจสอบแบบตรงทั้งหมด
    if (pt === checkType) return true;
    
    // ตรวจสอบเฉพาะกรณีพิเศษ
    if (type === "เงินสด" && (pt === "เงินสด" || pt === "cash")) return true;
    if (type === "เงินโอน" && (pt === "เงินโอน" || pt === "transfer")) return true;
    if (type === "เช็ค" && (pt === "เช็ค" || pt === "check")) return true;
    if (type === "สินเชื่อ FN" && (pt === "สินเชื่อ FN" || pt === "สินเชื่อ fn")) return true;
    
    return false;
  };

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image src={order.logo_url || "/logo.png"} style={styles.logo} />
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>ห้างหุ้นส่วนจำกัด นพดลมอเตอร์กรุ้ป{ZWJ}</Text>
          <Text style={styles.companyDetail}>359/2 หมู่ 6 ตำบลร้องเข็ม อำเภอร้องกวาง จังหวัดแพร่ 54140{ZWJ}</Text>
          <Text style={styles.companyDetail}>โทร. 099-376-8889  เลขประจำตัวผู้เสียภาษี 0543564001773{ZWJ}</Text>
        </View>
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeLabel}</Text>
          </View>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleBox}>
        <Text style={styles.title}>ใบเสร็จรับเงิน / ใบรับรถ</Text>
      </View>

      {/* ข้อมูลลูกค้า */}
      <View style={styles.customerSection}>
        <View style={styles.leftInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>นามลูกค้า</Text>
            <View style={styles.infoValue}><Text>{customerName}</Text></View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ที่อยู่</Text>
            <View style={styles.infoValueMultiline}><Text>{customerAddress}</Text></View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>เบอร์โทรศัพท์</Text>
            <View style={styles.infoValue}><Text>{customerPhone}</Text></View>
          </View>
        </View>
        <View style={styles.rightInfo}>
          <View style={styles.rightInfoRow}>
            <Text style={styles.rightInfoLabel}>เลขที่</Text>
            <View style={styles.rightInfoValue}><Text>{documentNo}</Text></View>
          </View>
          <View style={styles.rightInfoRow}>
            <Text style={styles.rightInfoLabel}>วันที่</Text>
            <View style={styles.rightInfoValue}><Text>{formattedDate}</Text></View>
          </View>
        </View>
      </View>

      {/* ตาราง */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ ...styles.headerText, ...styles.col1 }}>รายละเอียด</Text>
          <Text style={{ ...styles.headerText, ...styles.col2 }}>จำ{ZWJ}นวน</Text>
          <Text style={{ ...styles.headerText, ...styles.col3 }}>หน่วย</Text>
          <Text style={{ ...styles.headerText, ...styles.col4 }}>ราคา/หน่วย</Text>
          <Text style={{ ...styles.headerText, ...styles.col5 }}>จำ{ZWJ}นวนเงิน</Text>
        </View>
        <View style={styles.tableBody}>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>รถจักรยานยนต์</Text>
            <Text style={styles.col2}></Text><Text style={styles.col3}></Text>
            <Text style={styles.col4}></Text><Text style={styles.col5}></Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>  รุ่น {sanitizeText(bike?.model_name || bike?.name || '-')}{ZWJ}</Text>
            <Text style={styles.col2}>1</Text>
            <Text style={styles.col3}>คัน</Text>
            <Text style={styles.col4}>{fmt(salePrice)}</Text>
            <Text style={styles.col5}>{fmt(salePrice)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>  สี {sanitizeText(bike?.color || '-')}{ZWJ}</Text>
            <Text style={styles.col2}></Text><Text style={styles.col3}></Text>
            <Text style={styles.col4}></Text><Text style={styles.col5}></Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>  หมายเลขเครื่อง {sanitizeText(bike?.engine || '-')}{ZWJ}</Text>
            <Text style={styles.col2}></Text><Text style={styles.col3}></Text>
            <Text style={styles.col4}></Text><Text style={styles.col5}></Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>  หมายเลขตัวถัง {sanitizeText(bike?.chassi || '-')}{ZWJ}</Text>
            <Text style={styles.col2}></Text><Text style={styles.col3}></Text>
            <Text style={styles.col4}></Text><Text style={styles.col5}></Text>
          </View>
          
          {/* แถวสำหรับค่าใช้จ่ายเพิ่มเติม (ล็อค 3 แถวไว้) */}
          {Array.from({ length: 3 }).map((_, index) => {
            const fee = order.additional_fees && Array.isArray(order.additional_fees) 
              ? order.additional_fees[index] 
              : null;
            
            return (
              <View key={`fee-${index}`} style={styles.tableRow}>
                <Text style={styles.col1}>
                  {fee ? sanitizeText(fee.description || '') : ' '}
                </Text>
                <Text style={styles.col2}></Text>
                <Text style={styles.col3}></Text>
                <Text style={styles.col4}></Text>
                <Text style={styles.col5}>
                  {fee ? fmt(Number(fee.amount || 0)) : ' '}
                </Text>
              </View>
            );
          })}
          
          {/* แถวว่างสำรอง 2 แถว */}
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.emptyRow}>
              <Text style={styles.col1}> </Text>
              <Text style={styles.col2}> </Text>
              <Text style={styles.col3}> </Text>
              <Text style={styles.col4}> </Text>
              <Text style={styles.col5}> </Text>
            </View>
          ))}
        </View>
        <View style={styles.giftRow}>
          <Text style={styles.giftLabel}>ของแถม</Text>
          <View style={styles.giftContent}>
            <View style={{ flexDirection: 'row', width: '100%' }}>
              {/* คอลัมน์ซ้าย - รายการที่ 1-4 */}
              <View style={{ flex: 1, paddingRight: 4 }}>
                {Array.from({ length: 4 }).map((_, index) => {
                  const gift = order.gifts && Array.isArray(order.gifts) 
                    ? order.gifts[index] 
                    : null;
                  
                  return (
                    <Text key={`gift-left-${index}`} style={{ fontSize: 8, marginBottom: 1 }}>
                      {gift 
                        ? `${sanitizeText(gift.item?.name || gift.name || '')}${gift.quantity && gift.quantity > 1 ? ` (${gift.quantity})` : ''}`
                        : index === 0 ? '-' : ' '}
                    </Text>
                  );
                })}
              </View>
              
              {/* คอลัมน์ขวา - รายการที่ 5-8 */}
              <View style={{ flex: 1, paddingLeft: 4 }}>
                {Array.from({ length: 4 }).map((_, index) => {
                  const giftIndex = index + 4; // รายการที่ 5-8
                  const gift = order.gifts && Array.isArray(order.gifts) && order.gifts.length > 4
                    ? order.gifts[giftIndex] 
                    : null;
                  
                  return (
                    <Text key={`gift-right-${index}`} style={{ fontSize: 8, marginBottom: 1 }}>
                      {gift 
                        ? `${sanitizeText(gift.item?.name || gift.name || '')}${gift.quantity && gift.quantity > 1 ? ` (${gift.quantity})` : ''}`
                        : ' '}
                    </Text>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ส่วนล่าง */}
      <View style={styles.bottomSection}>
        <View style={styles.leftPayment}>
          {/* ✅ ประเภทการซื้อ */}
          <Text style={styles.paymentTitle}>ประเภทการซื้อ</Text>

          {/* เงินสด */}
          <View style={[styles.checkboxRow, { marginBottom: 1 }]}>
            <View style={styles.checkbox}>
              {!isFinance && (
                <View style={{
                  width: 8,
                  height: 8,
                  backgroundColor: '#000',
                }} />
              )}
            </View>
            <Text style={styles.checkLabel}>เงินสด</Text>
          </View>

          {/* สินเชื่อ + เส้นอยู่ติดกัน */}
          <View style={[styles.checkboxRow, { marginBottom: 0 }]}>
            <View style={styles.checkbox}>
              {isFinance && (
                <View style={{
                  width: 8,
                  height: 8,
                  backgroundColor: '#000',
                }} />
              )}
            </View>
            <Text style={styles.checkLabel}>สินเชื่อ FN:</Text>
          </View>
          <View style={{ marginLeft: 16, marginTop: 1, marginBottom: 4, borderBottom: '1pt solid #000', paddingBottom: 1 }}>
            <Text style={{ fontSize: 7.5 }}>
              {isFinance ? sanitizeText(order.finance_provider || '') : ' '}
            </Text>
          </View>

          {/* ✅ รูปแบบชำระ */}
          <Text style={[styles.paymentTitle, { marginTop: 3 }]}>รูปแบบการชำ{ZWJ}ระเงิน</Text>

          {/* เงินสด */}
          <View style={[styles.checkboxRow, { marginBottom: 1 }]}>
            <View style={styles.checkbox}>
              {isPaymentType("เงินสด") && (
                <View style={{
                  width: 8,
                  height: 8,
                  backgroundColor: '#000',
                }} />
              )}
            </View>
            <Text style={styles.checkLabel}>เงินสด</Text>
          </View>

          {/* เงินโอน + เส้นอยู่ติดกัน */}
          <View style={[styles.checkboxRow, { marginBottom: 0 }]}>
            <View style={styles.checkbox}>
              {isPaymentType("เงินโอน") && (
                <View style={{
                  width: 8,
                  height: 8,
                  backgroundColor: '#000',
                }} />
              )}
            </View>
            <Text style={styles.checkLabel}>เงินโอน</Text>
          </View>
          <View style={{ marginLeft: 16, marginTop: 1, marginBottom: 4, borderBottom: '1pt solid #000', paddingBottom: 1 }}>
            <Text style={{ fontSize: 7.5 }}>
              {isPaymentType("เงินโอน")
                ? sanitizeText(order.transfer_bank || '')
                : ' '}
            </Text>
          </View>

          {/* เช็ค + เส้นอยู่ติดกัน */}
          <View style={[styles.checkboxRow, { marginBottom: 0 }]}>
            <View style={styles.checkbox}>
              {isPaymentType("เช็ค") && (
                <View style={{
                  width: 8,
                  height: 8,
                  backgroundColor: '#000',
                }} />
              )}
            </View>
            <Text style={styles.checkLabel}>เช็คเลขที่</Text>
          </View>
          <View style={{ marginLeft: 16, marginTop: 1, marginBottom: 2, borderBottom: '1pt solid #000', paddingBottom: 1 }}>
            <Text style={{ fontSize: 7.5 }}>
              {isPaymentType("เช็ค")
                ? sanitizeText(order.check_number || '')
                : ' '}
            </Text>
          </View>
        </View>

        {/* ตัวอักษร */}
        <View style={styles.centerSection}>
          <Text style={styles.thaiLabel}>ตัวอักษร</Text>
          <View style={styles.thaiBox}>
            <Text style={styles.thaiText}>{totalInWords}</Text>
          </View>
        </View>

        {/* สรุปยอด */}
        <View style={styles.rightSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>รวมเงิน</Text>
            <Text style={styles.summaryValue}>{fmt(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>มัดจำ{ZWJ}</Text>
            <Text style={styles.summaryValue}>{fmt(deposit)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>หลังหักมัดจำ{ZWJ}</Text>
            <Text style={styles.summaryValue}>{fmt(afterDeposit)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>ส่วนลด</Text>
            <Text style={styles.summaryValue}>{fmt(discount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ width: "60%", textAlign: "right" }}>ยอดเงินสุทธิ</Text>
            <Text style={{ width: "40%", textAlign: "right" }}>{fmt(netTotal)}</Text>
          </View>
        </View>
      </View>

      {/* หมายเหตุ */}
      <View style={styles.notes}>
        <Text style={styles.noteTitle}>หมายเหตุ:</Text>
        <Text style={styles.noteItem}>1. กรณีชำระเงินโดยเช็คกรุณาสั่งจ่ายเช็คขีดคร่อมในนาม "ห้างหุ้นส่วนจำกัด นพดลมอเตอร์กรุ้ป" เท่านั้น{ZWJ}</Text>
        <Text style={styles.noteItem}>2. สินค้าตามรายการข้างต้นแม้จะได้ส่งมอบให้แก่ผู้ซื้อแล้วก็ยังคงเป็นทรัพย์สินของผู้ขายจนกว่าผู้ซื้อจะได้ชำระเงินเรียบร้อยแล้ว{ZWJ}</Text>
        <Text style={styles.noteItem}>3. ใบเสร็จรับเงินที่ถูกต้องจะต้องมีลายเซ็นต์ผู้รับเงินและประทับตราห้างฯ</Text>
      </View>

      {/* ได้รับสินค้า */}
      <View style={{ marginBottom: 3, fontSize: 8.5, textAlign: "center" }}>
        <Text>ได้รับสินค้าตามรายการข้างบนไว้เรียบร้อยแล้ว</Text>
      </View>

      {/* ลายเซ็น */}
      <View style={styles.signatureSection}>
        <View style={styles.sigBox}>
          <Text style={styles.sigTitle}>ผู้รับสินค้า</Text>
          <View style={styles.sigLine}></View>
          <Text style={styles.sigDate}>วันที่ ................................</Text>
        </View>
        <View style={styles.sigBox}>
          <Text style={styles.sigTitle}>ผู้รับเงิน</Text>
          <View style={styles.sigLine}></View>
          <Text style={styles.sigDate}>วันที่ ................................</Text>
        </View>
        <View style={styles.sigBox}>
          <Text style={styles.sigTitle}>ผู้มีอำ{ZWJ}นาจลงนาม</Text>
          <View style={styles.sigLine}></View>
          <Text style={styles.sigCompany}>ในนาม หจก.นพดลมอเตอร์กรุ้ป</Text>
        </View>
      </View>
    </View>
  );
};

// ============================
// Main: 4 Pages ใน 1 Document
// ============================
const SaleReceiptTemplate: React.FC<Props> = ({ order, customer: customerData }) => {
  if (!order) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={{ padding: 20 }}>
            <Text>ไม่พบข้อมูลคำสั่งซื้อ</Text>
          </View>
        </Page>
      </Document>
    );
  }

  const copies = ["ต้นฉบับ", "สำเนา 1", "สำเนา 2", "สำเนา 3"];

  try {
    return (
      <Document>
        {copies.map((label) => (
          <Page 
            key={label} 
            size="A4" 
            style={{
              ...styles.page,
              paddingTop: 50,  // เพิ่ม padding ด้านบนเพื่อเลื่อนเนื้อหาลง
            }}
          >
            <ReceiptPage order={order} customerData={customerData} badgeLabel={label} />
          </Page>
        ))}
      </Document>
    );
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return (
      <Document>
        <Page 
          size="A4" 
          style={{
            ...styles.page,
            paddingTop: 50,
          }}
        >
          <View style={{ padding: 20 }}>
            <Text>เกิดข้อผิดพลาดในการสร้าง PDF</Text>
            <Text style={{ fontSize: 8, marginTop: 10 }}>กรุณาตรวจสอบข้อมูล Order</Text>
          </View>
        </Page>
      </Document>
    );
  }
};

export default SaleReceiptTemplate;