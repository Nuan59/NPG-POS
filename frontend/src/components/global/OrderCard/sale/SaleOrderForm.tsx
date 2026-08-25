"use client";

import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useMemo } from "react";
import { numberToInput, toNumber, roundByMethod } from "../shared/Financecalculations";
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

  // ✅ ผ่อนดาวน์ (เฉพาะกรณีเงินสด) - จะไปขึ้นเป็นบัญชี NPG แยกต่างหากตอน checkout
  downPaymentInstallment: boolean;
  setDownPaymentInstallment: (value: boolean) => void;
  downPaymentInstallmentAmount: number;
  setDownPaymentInstallmentAmount: (value: number) => void;
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
  downPaymentInstallmentAmount,
  setDownPaymentInstallmentAmount,
  downPaymentInstallmentCount,
  setDownPaymentInstallmentCount,
  downPaymentInterestRate,
  setDownPaymentInterestRate,
}: SaleOrderFormProps) => {
  // ✅ คำนวณค่างวดผ่อนดาวน์แบบง่าย (รายเดือนเสมอ ไม่มีรถใหญ่/รถเล็ก เพราะเป็นการผ่อนดาวน์กับร้านเอง)
  const downPaymentInstallmentPerPeriod = useMemo(() => {
    const amount = downPaymentInstallmentAmount || 0;
    const count = toNumber(downPaymentInstallmentCount);
    if (amount <= 0 || count <= 0) return 0;

    const rate = toNumber(downPaymentInterestRate);
    const interestPerMonth = amount * (rate / 100);
    const total = amount + interestPerMonth * count;
    return roundByMethod(total / count, "standard");
  }, [downPaymentInstallmentAmount, downPaymentInstallmentCount, downPaymentInterestRate]);

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

            {/* ✅ ผ่อนดาวน์ - ลูกค้าจ่ายสดแต่ขอผ่อนเงินดาวน์เอง จะไปขึ้นบัญชี NPG แยกตอน checkout */}
            <div className="mt-3 flex items-center justify-between p-2 border-t border-slate-200 pt-3">
              <label className={labelCls}>ผ่อนดาวน์</label>
              <button
                type="button"
                onClick={() => setDownPaymentInstallment(!downPaymentInstallment)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  downPaymentInstallment
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {downPaymentInstallment ? "เปิดอยู่" : "ปิดอยู่"}
              </button>
            </div>

            {downPaymentInstallment && (
              <div className="mx-2 p-3 bg-orange-50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">เงินดาวน์ที่ผ่อน</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={numberToInput(downPaymentInstallmentAmount || 0)}
                    onChange={(e) =>
                      setDownPaymentInstallmentAmount(
                        e.target.value.trim() === "" ? 0 : Number(e.target.value)
                      )
                    }
                    className="w-40 text-right p-2 text-sm bg-white"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">จำนวนงวด</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={downPaymentInstallmentCount}
                    onChange={(e) => setDownPaymentInstallmentCount(e.target.value)}
                    placeholder="เช่น 3"
                    className="w-40 text-right p-2 text-sm bg-white"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">ดอกเบี้ย (%/เดือน)</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={downPaymentInterestRate}
                    onChange={(e) => setDownPaymentInterestRate(e.target.value)}
                    placeholder="0"
                    className="w-40 text-right p-2 text-sm bg-white"
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-orange-200">
                  <span className="text-sm font-semibold">ค่างวดที่ต้องผ่อน</span>
                  <span className="text-sm font-bold text-orange-700">
                    {downPaymentInstallmentPerPeriod
                      ? `฿ ${downPaymentInstallmentPerPeriod.toLocaleString()}`
                      : "-"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  * บันทึกออเดอร์แล้วระบบจะสร้างบัญชีผ่อนดาวน์ไว้ในเมนู NPG ให้อัตโนมัติ
                </p>
              </div>
            )}
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
          />
        )}
      </div>
    </>
  );
};

export default SaleOrderForm;