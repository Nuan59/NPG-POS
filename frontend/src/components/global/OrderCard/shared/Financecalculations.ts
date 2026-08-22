import { useEffect, useMemo, useState } from "react";

/**
 * ไฟล์รวม Logic การคำนวณเงินทั้งหมด
 * - Types
 * - Utility functions
 * - Custom hooks สำหรับคำนวณไฟแนนซ์และ checkout
 */

// ================== TYPES ==================
export type FinanceProvider = "Cathay" | "ทรัพย์สยาม" | "NPG" | "Summit" | "S Leasing" | "CIMB" | "World Lease" | "เงินติดล้อ" | "";
export type NpgPeriod = "รายปี" | "รายเดือน" | "";
export type RoundingMethod = "standard" | "up" | "down";

// ================== UTILITY FUNCTIONS ==================

/**
 * แปลง string เป็น number โดยถ้าเป็น string ว่างจะคืนค่า 0
 */
export const toNumber = (s: string): number => {
  const t = s.trim();
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

/**
 * แปลง number เป็น string สำหรับ input โดยถ้าเป็น 0 จะคืนค่า ""
 */
export const numberToInput = (n: number) => (n === 0 ? "" : String(n));

/**
 * แปลงราคาให้เป็นตัวเลข (รองรับ comma)
 */
export const parseSellPrice = (sellPrice: string | number): number => {
  const n = Number(String(sellPrice ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

/**
 * ปัดเศษตามวิธีที่เลือก
 * - standard: ปัดเศษมาตรฐาน (< 0.5 ปัดลง, >= 0.5 ปัดขึ้น)
 * - up: ปัดขึ้นเสมอ
 * - down: ปัดลงเสมอ
 */
export const roundByMethod = (value: number, method: RoundingMethod): number => {
  switch (method) {
    case "up":
      return Math.ceil(value);
    case "down":
      return Math.floor(value);
    case "standard":
    default:
      return Math.round(value);
  }
};

/**
 * ✅ เดา cc ของรถจากชื่อรุ่น/รหัสรุ่น (เช่น "PCX160" -> 160, "FORZA350" -> 350)
 * ใช้ตัวเลขที่ยาวที่สุดที่เจอ (2-4 หลัก) เพราะรุ่นรถมักฝัง cc ไว้ในชื่อ/รหัส
 * เดาไม่ได้ (ไม่เจอตัวเลขที่สมเหตุสมผล) จะคืน 0
 */
export const guessEngineCC = (modelName?: string, modelCode?: string): number => {
  const text = `${modelName || ""} ${modelCode || ""}`;
  const matches = text.match(/\d{2,4}/g);
  if (!matches || matches.length === 0) return 0;

  // เลือกตัวเลขที่ใหญ่ที่สุดที่เจอ (กัน false positive จากตัวเลขอื่นในชื่อ เช่น "150i" ปนกับปีรุ่น)
  const numbers = matches.map((m) => Number(m)).filter((n) => n >= 50 && n <= 2000);
  if (numbers.length === 0) return 0;
  return Math.max(...numbers);
};

// ✅ เกณฑ์ cc ที่ถือว่าเป็น "รถใหญ่" - ปกติไฟแนนซ์จะคิดดอกเบี้ยแบบรายปีสำหรับรถกลุ่มนี้
export const BIG_BIKE_CC_THRESHOLD = 300;

export const isBigBike = (modelName?: string, modelCode?: string): boolean =>
  guessEngineCC(modelName, modelCode) >= BIG_BIKE_CC_THRESHOLD;

// ================== CUSTOM HOOKS ==================

interface UseFinanceCalculationsProps {
  sellPrice: string;
  discount: number;
  down_payment: number;
  financeProvider: FinanceProvider;
  npgPeriod: NpgPeriod;
  roundingMethod?: RoundingMethod; // เพิ่ม optional parameter
  // ✅ true ถ้าเป็นรถใหญ่ (≥300cc) - มีผลเฉพาะไฟแนนซ์ที่ไม่ใช่ NPG เท่านั้น
  // (NPG ไม่สนขนาดรถเลย ใช้ npgPeriod เลือกเองอย่างเดียว)
  isBigBike?: boolean;
}

/**
 * Custom Hook สำหรับคำนวณไฟแนนซ์
 * - คำนวณยอดจัด (financeAmount)
 * - คำนวณค่างวด (installmentPerPeriod)
 * - สร้าง label สำหรับค่างวด
 */
export const useFinanceCalculations = ({
  sellPrice,
  discount,
  down_payment,
  financeProvider,
  npgPeriod,
  roundingMethod = "standard", // ค่าเริ่มต้นเป็นปัดเศษมาตรฐาน
  isBigBike = false,
}: UseFinanceCalculationsProps) => {
  const [financeAmount, setFinanceAmount] = useState<string>("");
  const [interest, setInterest] = useState<string>("");
  const [installmentCount, setInstallmentCount] = useState<string>("");
  const [installmentPerPeriod, setInstallmentPerPeriod] = useState<string>("");

  // คำนวณยอดจัด = ขาย - ส่วนลด - เงินดาวน์
  const computedFinanceAmount = useMemo(() => {
    const sell = toNumber(sellPrice);
    const disc = discount || 0;
    const down = down_payment || 0;
    const v = sell - disc - down;
    return v > 0 ? v : 0;
  }, [sellPrice, discount, down_payment]);

  // อัปเดตยอดจัดเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    const sellEmpty = sellPrice.trim() === "";
    const discEmpty = (discount || 0) === 0;
    const downEmpty = (down_payment || 0) === 0;

    if (sellEmpty && discEmpty && downEmpty) {
      setFinanceAmount("");
      return;
    }
    setFinanceAmount(String(computedFinanceAmount));
  }, [sellPrice, discount, down_payment, computedFinanceAmount]);

  // ✅ คำนวณค่างวด
  // - ไฟแนนซ์ NPG: ใช้ npgPeriod (รายเดือน/รายปี) - รายปี = รวมยอด 12 เดือนมาจ่ายทีเดียว ไม่สนขนาดรถ
  // - ไฟแนนซ์เจ้าอื่น: จ่ายรายเดือนเสมอ (installmentCount = จำนวนเดือนจริง)
  //   แต่ถ้าเป็นรถใหญ่ (isBigBike) ตัวเลข "ดอกเบี้ย" ที่กรอกถือเป็นอัตรารายปี ต้องหาร 12 ก่อนคิดต่อเดือน
  useEffect(() => {
    if (financeAmount.trim() === "") {
      setInstallmentPerPeriod("");
      return;
    }

    const count = toNumber(installmentCount);
    if (installmentCount.trim() === "" || count <= 0) {
      setInstallmentPerPeriod("");
      return;
    }

    const principal = toNumber(financeAmount);
    const ratePctEntered = toNumber(interest);

    let perPeriod: number;

    if (financeProvider === "NPG") {
      const isYearly = npgPeriod === "รายปี";
      const months = isYearly ? count * 12 : count;

      if (months <= 0) {
        setInstallmentPerPeriod("");
        return;
      }

      const interestPerMonth = principal * (ratePctEntered / 100);
      const totalInterest = interestPerMonth * months;
      const perMonth = (principal + totalInterest) / months;
      perPeriod = isYearly ? perMonth * 12 : perMonth;
    } else {
      // ไฟแนนซ์เจ้าอื่น: จ่ายรายเดือนเสมอ
      const months = count;
      // รถใหญ่ = อัตราที่กรอกเป็นรายปี ต้องหาร 12 ก่อนคิดดอกเบี้ยต่อเดือน
      const monthlyRatePct = isBigBike ? ratePctEntered / 12 : ratePctEntered;
      const interestPerMonth = principal * (monthlyRatePct / 100);
      const totalInterest = interestPerMonth * months;
      perPeriod = (principal + totalInterest) / months;
    }

    const rounded = roundByMethod(perPeriod, roundingMethod);
    setInstallmentPerPeriod(String(rounded));
  }, [financeAmount, installmentCount, interest, financeProvider, npgPeriod, roundingMethod, isBigBike]);

  // สร้าง label สำหรับค่างวด
  const installmentLabel = useMemo(() => {
    return "ค่างวด";
  }, []);

  return {
    financeAmount,
    setFinanceAmount,
    interest,
    setInterest,
    installmentCount,
    setInstallmentCount,
    installmentPerPeriod,
    installmentLabel,
  };
};

// ================== TOTALS CALCULATIONS ==================

/**
 * คำนวณค่าธรรมเนียมรวม
 */
export const calculateTotalAdditionalFees = (
  additionalFees: Array<{ amount: number }>
): number => {
  return additionalFees.reduce((sum, fee) => sum + fee.amount, 0);
};

/**
 * คำนวณราคารวมเงินสด = ขาย + ค่าธรรมเนียม - ส่วนลด - มัดจำ
 */
export const calculateCashTotal = (
  sellPrice: string,
  totalAdditionalFees: number,
  discount: number,
  deposit: number
): number => {
  return toNumber(sellPrice) + totalAdditionalFees - (discount || 0) - (deposit || 0);
};

/**
 * คำนวณยอดชำระรวม (ไฟแนนซ์) = เงินดาวน์ + ค่าธรรมเนียม - มัดจำ
 * ✅ ไม่หัก discount ซ้ำที่นี่ เพราะส่วนลดถูกหักไปแล้วครั้งเดียวตอนคำนวณ "ยอดจัด"
 * (เดิมหักซ้ำ 2 ครั้ง ทำให้ยอดชำระรวมน้อยเกินจริงไป = ส่วนลด)
 */
export const calculateTotalPayment = (
  down_payment: number,
  totalAdditionalFees: number,
  discount: number,
  deposit: number
): number => {
  return (down_payment || 0) + totalAdditionalFees - (deposit || 0);
};