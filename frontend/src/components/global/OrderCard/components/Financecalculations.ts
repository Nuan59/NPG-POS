import { useEffect, useMemo, useState } from "react";

/**
 * ไฟล์รวม Logic การคำนวณเงินทั้งหมด
 * - Types
 * - Utility functions
 * - Custom hooks สำหรับคำนวณไฟแนนซ์และ checkout
 */

// ================== TYPES ==================
export type FinanceProvider = "Cathay" | "ทรัพย์สยาม" | "NPG" | "";
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

// ================== CUSTOM HOOKS ==================

interface UseFinanceCalculationsProps {
  sellPrice: string;
  discount: number;
  down_payment: number;
  financeProvider: FinanceProvider;
  npgPeriod: NpgPeriod;
  roundingMethod?: RoundingMethod; // เพิ่ม optional parameter
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

  // คำนวณค่างวด
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
    const isNpgYearly = financeProvider === "NPG" && npgPeriod === "รายปี";
    
    // คำนวณดอกเบี้ยต่อเดือน
    const ratePctPerMonth = toNumber(interest);
    const interestPerMonth = principal * (ratePctPerMonth / 100);
    
    if (isNpgYearly) {
      // กรณี NPG รายปี: คิดดอกเบี้ยเป็นเดือน แต่แบ่งชำระเป็นรายปี
      const totalMonths = count * 12;
      const totalInterest = interestPerMonth * totalMonths;
      const totalAmount = principal + totalInterest;
      const perYear = totalAmount / count; // แบ่งตามจำนวนปี
      
      const roundedPerYear = roundByMethod(perYear, roundingMethod);
      setInstallmentPerPeriod(String(roundedPerYear));
    } else {
      // กรณีปกติ (รายเดือน): คำนวณต่อเดือน
      const months = count;
      
      if (months <= 0) {
        setInstallmentPerPeriod("");
        return;
      }
      
      const totalInterest = interestPerMonth * months;
      const perMonth = (principal + totalInterest) / months;
      
      const roundedPerMonth = roundByMethod(perMonth, roundingMethod);
      setInstallmentPerPeriod(String(roundedPerMonth));
    }
  }, [financeAmount, installmentCount, interest, financeProvider, npgPeriod, roundingMethod]);

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
 * คำนวณยอดชำระรวม (ไฟแนนซ์) = เงินดาวน์ + ค่าธรรมเนียม - ส่วนลด - มัดจำ
 */
export const calculateTotalPayment = (
  down_payment: number,
  totalAdditionalFees: number,
  discount: number,
  deposit: number
): number => {
  return (down_payment || 0) + totalAdditionalFees - (discount || 0) - (deposit || 0);
};