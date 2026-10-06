// serviceRecordUtil.ts
// วางไฟล์นี้ใน: frontend/src/app/(private)/service-history/[service-history_id]/components/serviceRecordUtil.ts
import { TempReceiptItem } from "@/components/pdf/TempReceiptTemplate";

// ✅ แปลง notes กลับเป็นรายการ - useServiceOrderCheckout บันทึกเป็นบรรทัด "- รายละเอียด: 1,234 บาท"
// ถ้าแกะไม่ได้ fallback เป็นรายการเดียวรวมยอดทั้งหมด
export const parseItemsFromNotes = (
  notes: string | undefined,
  fallbackLabel: string,
  total: number
): TempReceiptItem[] => {
  if (!notes) return [{ description: fallbackLabel, amount: total }];
  const pattern = /^-\s*(.+?):\s*([\d,]+)\s*บาท\s*$/;
  const items: TempReceiptItem[] = [];
  for (const line of notes.split("\n")) {
    const match = line.trim().match(pattern);
    if (match) {
      items.push({ description: match[1].trim(), amount: Number(match[2].replace(/,/g, "")) });
    }
  }
  return items.length > 0 ? items : [{ description: fallbackLabel, amount: total }];
};

// ✅ เอาเฉพาะส่วน "รายละเอียดงาน" ที่ไม่ใช่บรรทัดรายการ ไว้แสดงเป็นหมายเหตุ
export const getNotesWithoutItems = (notes: string | undefined): string => {
  if (!notes) return "";
  const pattern = /^-\s*(.+?):\s*([\d,]+)\s*บาท\s*$/;
  return notes
    .split("\n")
    .filter((line) => !pattern.test(line.trim()))
    .join("\n")
    .trim();
};

export const formatDate = (dateString: string) => {
  if (!dateString) return new Date().toLocaleDateString("th-TH");
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};