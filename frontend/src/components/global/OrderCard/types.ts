// ประเภทธุรกรรมในออเดอร์ - ใช้ร่วมกันทั้ง OrderCard

export type TransactionType = "ขาย" | "ซ่อม" | "ต่อภาษี+พรบ" | "อื่นๆ";

export const TRANSACTION_TYPES: TransactionType[] = [
  "ขาย",
  "ซ่อม",
  "ต่อภาษี+พรบ",
  "อื่นๆ",
];