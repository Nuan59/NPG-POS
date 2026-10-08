"use client";

import { Input } from "@/components/ui/input";
import type { FinanceProvider, NpgPeriod } from "../shared/Financecalculations";
import { numberToInput } from "../shared/Financecalculations";
import { FinanceSection, FormRow, SegButtons, StepLabel } from "../shared/PaymentSection";

const inputCls = "w-36 h-9 text-right text-sm bg-white";

interface SaleOrderFormProps {
  sellPrice: string;
  setSellPrice: (value: string) => void;

  paymentMethod: string;
  setPaymentMethod: (value: string) => void;

  deposit: number;
  setDeposit: (value: number) => void;
  depositReceiptNo: string;
  setDepositReceiptNo: (value: string) => void;
  discount: number;
  setDiscount: (value: number) => void;

  financeProvider: FinanceProvider;
  setFinanceProvider: (value: FinanceProvider) => void;
  npgPeriod: NpgPeriod;
  setNpgPeriod: (value: NpgPeriod) => void;
  bikeSize: "S" | "M" | "L" | "";
  setBikeSize: (value: "S" | "M" | "L" | "") => void;
  downPayment: number;
  setDownPayment: (value: number) => void;
  financeAmount: string;
  interest: string;
  setInterest: (value: string) => void;
  installmentCount: string;
  setInstallmentCount: (value: string) => void;

  // ✅ ผ่อนดาวน์ (เฉพาะไฟแนนซ์) - จะไปขึ้นเป็นบัญชี NPG แยกต่างหากตอน checkout
  downPaymentInstallment: boolean;
  setDownPaymentInstallment: (value: boolean) => void;
  downPaymentFirstPaymentAmount: number;
  setDownPaymentFirstPaymentAmount: (value: number) => void;
  downPaymentInstallmentCount: string;
  setDownPaymentInstallmentCount: (value: string) => void;
  downPaymentInterestRate: string;
  setDownPaymentInterestRate: (value: string) => void;
  downPaymentNextPaymentDate: string;
  setDownPaymentNextPaymentDate: (value: string) => void;
}

/**
 * ฟอร์มราคา/การชำระเงินสำหรับประเภท "ขาย" เท่านั้น
 * ✅ "เงินสด/ไฟแนนซ์" เป็นปุ่มสลับ / ไฟแนนซ์มีช่องเลขใบมัดจำแล้ว
 */
const SaleOrderForm = ({
  sellPrice,
  setSellPrice,
  paymentMethod,
  setPaymentMethod,
  deposit,
  setDeposit,
  depositReceiptNo,
  setDepositReceiptNo,
  discount,
  setDiscount,
  financeProvider,
  setFinanceProvider,
  npgPeriod,
  setNpgPeriod,
  bikeSize,
  setBikeSize,
  downPayment,
  setDownPayment,
  financeAmount,
  interest,
  setInterest,
  installmentCount,
  setInstallmentCount,
  downPaymentInstallment,
  setDownPaymentInstallment,
  downPaymentFirstPaymentAmount,
  setDownPaymentFirstPaymentAmount,
  downPaymentInstallmentCount,
  setDownPaymentInstallmentCount,
  downPaymentInterestRate,
  setDownPaymentInterestRate,
  downPaymentNextPaymentDate,
  setDownPaymentNextPaymentDate,
}: SaleOrderFormProps) => {
  return (
    <>
      <StepLabel step={4} label="ราคา" />

      <div className="bg-white border border-slate-200 rounded-2xl px-3 py-1">
        {/* ราคาขาย (เติมจากราคาตั้งของรถให้อัตโนมัติ แก้เองได้) */}
        <FormRow label="ราคาขาย">
          <Input
            type="text"
            inputMode="decimal"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </FormRow>

        {/* ประเภทการซื้อ */}
        <FormRow label="ประเภทการซื้อ">
          <SegButtons
            options={[
              { value: "เงินสด", label: "เงินสด" },
              { value: "ไฟแนนซ์", label: "ไฟแนนซ์" },
            ]}
            value={paymentMethod}
            onChange={setPaymentMethod}
          />
        </FormRow>

        {/* เงินสด */}
        {paymentMethod === "เงินสด" && (
          <>
            <FormRow label="มัดจำ">
              <Input
                type="text"
                inputMode="decimal"
                value={numberToInput(deposit || 0)}
                onChange={(e) => setDeposit(e.target.value.trim() === "" ? 0 : Number(e.target.value))}
                className={inputCls}
              />
            </FormRow>

            {/* เลขใบมัดจำ - แสดงเมื่อมัดจำ > 0 */}
            {deposit > 0 && (
              <FormRow label="เลขใบมัดจำ" sub>
                <Input
                  type="text"
                  value={depositReceiptNo}
                  onChange={(e) => setDepositReceiptNo(e.target.value)}
                  className="w-32 h-8 text-right text-sm bg-white"
                  placeholder="MD-XXXX"
                />
              </FormRow>
            )}

            <FormRow label="ส่วนลด">
              <Input
                type="text"
                inputMode="decimal"
                value={numberToInput(discount || 0)}
                onChange={(e) => setDiscount(e.target.value.trim() === "" ? 0 : Number(e.target.value))}
                className={inputCls}
              />
            </FormRow>
          </>
        )}

        {/* ไฟแนนซ์ */}
        {paymentMethod === "ไฟแนนซ์" && (
          <FinanceSection
            financeProvider={financeProvider}
            setFinanceProvider={setFinanceProvider}
            npgPeriod={npgPeriod}
            setNpgPeriod={setNpgPeriod}
            bikeSize={bikeSize}
            setBikeSize={setBikeSize}
            deposit={deposit}
            setDeposit={setDeposit}
            depositReceiptNo={depositReceiptNo}
            setDepositReceiptNo={setDepositReceiptNo}
            discount={discount || 0}
            setDiscount={setDiscount}
            down_payment={downPayment || 0}
            setDown_payment={setDownPayment}
            financeAmount={financeAmount}
            interest={interest}
            setInterest={setInterest}
            installmentCount={installmentCount}
            setInstallmentCount={setInstallmentCount}
            downPaymentInstallment={downPaymentInstallment}
            setDownPaymentInstallment={setDownPaymentInstallment}
            downPaymentFirstPaymentAmount={downPaymentFirstPaymentAmount}
            setDownPaymentFirstPaymentAmount={setDownPaymentFirstPaymentAmount}
            downPaymentInstallmentCount={downPaymentInstallmentCount}
            setDownPaymentInstallmentCount={setDownPaymentInstallmentCount}
            downPaymentInterestRate={downPaymentInterestRate}
            setDownPaymentInterestRate={setDownPaymentInterestRate}
            downPaymentNextPaymentDate={downPaymentNextPaymentDate}
            setDownPaymentNextPaymentDate={setDownPaymentNextPaymentDate}
          />
        )}
      </div>
    </>
  );
};

export default SaleOrderForm;