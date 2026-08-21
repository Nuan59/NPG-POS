// salesHelpers.ts
// วางไฟล์นี้ใน: src/app/(private)/reports/util/salesHelpers.ts

// ✅ รายชื่อไฟแนนซ์ทั้งหมด (เหมือนกับที่ใช้ใน calculations.ts ฝั่งแก้ไขการขาย)
export const FINANCE_PROVIDERS = [
  "Cathay",
  "ทรัพย์สยาม",
  "NPG",
  "Summit",
  "S Leasing",
  "CIMB",
  "World Lease",
  "เงินติดล้อ",
  "ไฟแนนซ์",
];

/** สด หรือ ผ่อน (2 กลุ่ม ใช้กับตารางรายละเอียด) */
export const classifyCashOrInstallment = (paymentMethod: string): "เงินสด" | "ผ่อนชำระ" =>
  FINANCE_PROVIDERS.includes(paymentMethod) ? "ผ่อนชำระ" : "เงินสด";

/** เงินสด / ไฟแนนซ์ / ผ่อนกับร้าน (3 กลุ่ม ใช้กับกราฟวงกลมวิธีชำระเงิน) */
export const classifyPaymentGroup = (
  paymentMethod: string
): "เงินสด" | "ไฟแนนซ์" | "ผ่อนกับร้าน" => {
  const method = (paymentMethod || "").toLowerCase().trim();

  if (method.includes("npg") || method.includes("ผ่อนกับร้าน")) {
    return "ผ่อนกับร้าน";
  }
  if (
    method.includes("cathay") ||
    method.includes("ทรัพย์สยาม") ||
    method.includes("ไฟแนนซ์") ||
    method === "finance"
  ) {
    return "ไฟแนนซ์";
  }
  return "เงินสด";
};