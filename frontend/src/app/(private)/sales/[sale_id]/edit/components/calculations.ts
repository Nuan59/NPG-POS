// calculations.ts
// วางไฟล์นี้ใน: src/app/(private)/sales/[sale_id]/edit/components/

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

  const isFinance =
    paymentMethod === "Cathay" ||
    paymentMethod === "ทรัพย์สยาม" ||
    paymentMethod === "NPG" ||
    paymentMethod === "ไฟแนนซ์";

  let calculatedTotal = 0;

  if (isFinance) {
    calculatedTotal = downPayment + feesTotal - deposit - discount;
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
  const isFinance =
    paymentMethod === "Cathay" ||
    paymentMethod === "ทรัพย์สยาม" ||
    paymentMethod === "NPG" ||
    paymentMethod === "ไฟแนนซ์";

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
 * คำนวณค่างวด
 */
export const calculateInstallmentAmount = (getValues: any, setValue: any) => {
  const paymentMethod = getValues("paymentMethod");
  const isFinance =
    paymentMethod === "Cathay" ||
    paymentMethod === "ทรัพย์สยาม" ||
    paymentMethod === "NPG" ||
    paymentMethod === "ไฟแนนซ์";

  if (!isFinance) return;

  const financeAmount = toNumber(getValues("financeAmount"));
  const installmentCount = toNumber(getValues("installmentCount"));
  const interestRate = toNumber(getValues("interestRate"));
  const npgPeriod = getValues("npgPeriod");

  if (installmentCount <= 0 || financeAmount <= 0) {
    setValue("installmentAmount", 0);
    return;
  }

  const isNpgYearly = paymentMethod === "NPG" && npgPeriod === "รายปี";
  const months = isNpgYearly ? installmentCount * 12 : installmentCount;

  const interestPerMonth = financeAmount * (interestRate / 100);
  const totalInterest = interestPerMonth * months;

  const perMonth = (financeAmount + totalInterest) / months;
  const perPeriod = isNpgYearly ? perMonth * 12 : perMonth;

  setValue(
    "installmentAmount",
    Number.isFinite(perPeriod) ? Number(perPeriod.toFixed(2)) : 0
  );
};

/**
 * ตรวจสอบว่าเป็นไฟแนนซ์หรือไม่
 */
export const isFinanceMethod = (paymentMethod: string): boolean => {
  return (
    paymentMethod === "Cathay" ||
    paymentMethod === "ทรัพย์สยาม" ||
    paymentMethod === "NPG" ||
    paymentMethod === "ไฟแนนซ์"
  );
};