// calculations.ts
// วางไฟล์นี้ใน: src/app/(private)/sales/[sale_id]/edit/components/

// ✅ รายชื่อไฟแนนซ์ทั้งหมด (ต้องตรงกับ dropdown ที่เลือกได้จริงในระบบ)
// แก้ที่นี่ที่เดียว ทุกฟังก์ชันในไฟล์นี้ใช้ร่วมกัน กันปัญหาลืมเพิ่มเจ้าใหม่บางจุดแบบที่เคยเกิดมาก่อน
const FINANCE_PROVIDERS = [
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

const checkIsFinance = (paymentMethod: string): boolean =>
  FINANCE_PROVIDERS.includes(paymentMethod);

/**
 * แปลงค่าเป็นตัวเลข
 */
export const toNumber = (s: string | number | undefined): number => {
  if (s === undefined || s === null) return 0;
  const t = String(s).trim();
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

/**
 * ✅ เดา cc ของรถจากชื่อรุ่น/รหัสรุ่น (เช่น "PCX160" -> 160, "FORZA350" -> 350)
 * เหมือนกับ guessEngineCC ใน OrderCard/shared/Financecalculations.ts เป๊ะ - ให้ผลตรงกันทั้งระบบ
 */
export const guessEngineCC = (modelName?: string, modelCode?: string): number => {
  const text = `${modelName || ""} ${modelCode || ""}`;
  const matches = text.match(/\d{2,4}/g);
  if (!matches || matches.length === 0) return 0;
  const numbers = matches.map((m) => Number(m)).filter((n) => n >= 50 && n <= 2000);
  if (numbers.length === 0) return 0;
  return Math.max(...numbers);
};

export const BIG_BIKE_CC_THRESHOLD = 300;

export const isBigBike = (modelName?: string, modelCode?: string): boolean =>
  guessEngineCC(modelName, modelCode) >= BIG_BIKE_CC_THRESHOLD;

/**
 * คำนวณยอดรวม
 */
export const calculateTotal = (
  getValues: any,
  setTotal: (value: number) => void
) => {
  const discount = Number(getValues("discount") || 0);
  const downPayment = Number(getValues("downPayment") || 0);
  const deposit = Number(getValues("deposit") || 0);
  const paymentMethod = getValues("paymentMethod");
  const salePrice = Number(getValues("salePrice") || 0);

  let feesTotal = 0;
  const fees = getValues("additionalFees");
  fees.forEach((fee: any) => {
    feesTotal += Number(fee.amount || 0);
  });

  const isFinance = checkIsFinance(paymentMethod);

  let calculatedTotal = 0;

  if (isFinance) {
    // ✅ ไม่หัก discount ซ้ำ เพราะถูกหักไปแล้วครั้งเดียวตอนคำนวณ "ยอดจัด" (financeAmount)
    calculatedTotal = downPayment + feesTotal - deposit;
  } else {
    calculatedTotal = salePrice + feesTotal - deposit - discount;
  }

  setTotal(calculatedTotal);
};

/**
 * คำนวณยอดจัดไฟแนนซ์
 */
export const calculateFinanceAmount = (getValues: any, setValue: any) => {
  const paymentMethod = getValues("paymentMethod");
  const isFinance = checkIsFinance(paymentMethod);

  if (!isFinance) return;

  const salePrice = toNumber(getValues("salePrice"));
  const discount = toNumber(getValues("discount"));
  const downPayment = toNumber(getValues("downPayment"));

  const calculatedFinanceAmount = salePrice - discount - downPayment;
  setValue(
    "financeAmount",
    calculatedFinanceAmount > 0 ? calculatedFinanceAmount : 0
  );
};

/**
 * ✅ คำนวณค่างวด (ตรงกับ logic ใหม่ใน OrderCard/shared/Financecalculations.ts):
 * - ไฟแนนซ์ NPG: ใช้ npgPeriod (รายเดือน/รายปี) - รายปี = รวมยอด 12 เดือนมาจ่ายทีเดียว ไม่สนขนาดรถ
 * - ไฟแนนซ์เจ้าอื่น: จ่ายรายเดือนเสมอ แต่ถ้าเป็นรถใหญ่ (isBigBike) ดอกเบี้ยที่กรอกถือเป็นอัตรารายปี
 *   ต้องหาร 12 ก่อนคิดต่อเดือน
 */
export const calculateInstallmentAmount = (getValues: any, setValue: any) => {
  const paymentMethod = getValues("paymentMethod");
  const isFinance = checkIsFinance(paymentMethod);

  if (!isFinance) return;

  const financeAmount = toNumber(getValues("financeAmount"));
  const installmentCount = toNumber(getValues("installmentCount"));
  const interestRate = toNumber(getValues("interestRate"));
  const npgPeriod = getValues("npgPeriod");

  if (installmentCount <= 0 || financeAmount <= 0) {
    setValue("installmentAmount", 0);
    return;
  }

  let perPeriod: number;

  if (paymentMethod === "NPG") {
    const isNpgYearly = npgPeriod === "รายปี";
    const months = isNpgYearly ? installmentCount * 12 : installmentCount;

    const interestPerMonth = financeAmount * (interestRate / 100);
    const totalInterest = interestPerMonth * months;

    const perMonth = (financeAmount + totalInterest) / months;
    perPeriod = isNpgYearly ? perMonth * 12 : perMonth;
  } else {
    // ไฟแนนซ์เจ้าอื่น: จ่ายรายเดือนเสมอ
    const months = installmentCount;
    // ✅ อ่านค่า "bikeSize" (S/M/L) ที่ตั้งไว้ในฟอร์ม - L = ดอกเบี้ยที่กรอกเป็นอัตรารายปี
    const bikeSize = getValues("bikeSize");
    const bikeIsBig =
      bikeSize === "L"
        ? true
        : bikeSize === "S" || bikeSize === "M"
        ? false
        : isBigBike(getValues("bikeModelName"), getValues("bikeModelCode"));
    const monthlyRatePct = bikeIsBig ? interestRate / 12 : interestRate;

    const interestPerMonth = financeAmount * (monthlyRatePct / 100);
    const totalInterest = interestPerMonth * months;
    perPeriod = (financeAmount + totalInterest) / months;
  }

  setValue(
    "installmentAmount",
    Number.isFinite(perPeriod) ? Number(perPeriod.toFixed(2)) : 0
  );
};

/**
 * ตรวจสอบว่าเป็นไฟแนนซ์หรือไม่
 */
export const isFinanceMethod = (paymentMethod: string): boolean => {
  return checkIsFinance(paymentMethod);
};