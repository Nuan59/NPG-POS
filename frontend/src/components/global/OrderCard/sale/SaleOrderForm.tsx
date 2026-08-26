"use client";

import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { numberToInput } from "../shared/Financecalculations";
import type { FinanceProvider, NpgPeriod } from "../shared/Financecalculations";
import { FinanceSection } from "../shared/PaymentSection";

const labelCls = "text-sm font-medium min-w-[100px]";
const inputCls = "w-40 text-right p-2 text-sm";

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
}

/**
 * ฟอร์มราคา/การชำระเงินสำหรับประเภท "ขาย" เท่านั้น
 * (ย้ายออกมาจาก index.tsx เดิม - logic ไม่เปลี่ยนแปลงแม้แต่บรรทัดเดียว)
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
}: SaleOrderFormProps) => {
  return (
    <>
      <Separator className="my-4" />

      <div className="space-y-3">
        {/* ราคาขาย */}
        <div className="flex justify-between items-center p-2">
          <label className={labelCls}>ขาย</label>
          <Input
            type="text"
            inputMode="decimal"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            className={inputCls}
            placeholder="0"
          />
        </div>

        {/* ประเภทการซื้อ */}
        <div className="flex justify-between items-center p-2">
          <label className={labelCls}>ประเภทการซื้อ</label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="w-40 text-sm p-2">
              {paymentMethod || "เลือก"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="เงินสด">เงินสด</SelectItem>
              <SelectItem value="ไฟแนนซ์">ไฟแนนซ์</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ถ้าเลือกเงินสด */}
        {paymentMethod === "เงินสด" && (
          <>
            <div className="mt-2 flex justify-between items-center p-2">
              <label className={labelCls}>มัดจำ</label>
              <Input
                type="text"
                inputMode="decimal"
                value={numberToInput(deposit || 0)}
                onChange={(e) =>
                  setDeposit(
                    e.target.value.trim() === "" ? 0 : Number(e.target.value)
                  )
                }
                className={inputCls}
              />
            </div>

            {/* ช่องเลขใบมัดจำ - แสดงเมื่อมัดจำ > 0 */}
            {deposit > 0 && (
              <div className="mt-1 flex justify-between items-center p-2">
                <label className={labelCls}>เลขใบมัดจำ</label>
                <Input
                  type="text"
                  value={depositReceiptNo}
                  onChange={(e) => setDepositReceiptNo(e.target.value)}
                  className={inputCls}
                  placeholder="MD-XXXX"
                />
              </div>
            )}

            <div className="mt-2 flex justify-between items-center p-2">
              <label className={labelCls}>ส่วนลด</label>
              <Input
                type="text"
                inputMode="decimal"
                value={numberToInput(discount || 0)}
                onChange={(e) =>
                  setDiscount(
                    e.target.value.trim() === "" ? 0 : Number(e.target.value)
                  )
                }
                className={inputCls}
              />
            </div>
          </>
        )}

        {/* ถ้าเลือกไฟแนนซ์ */}
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
          />
        )}
      </div>
    </>
  );
};

export default SaleOrderForm;