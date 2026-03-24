import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FinanceProvider, NpgPeriod, numberToInput } from "./financeCalculations";

/**
 * ไฟล์รวม UI การชำระเงินทั้งหมด
 * - FinanceSection: ส่วนไฟแนนซ์
 * - PaymentTypeSection: ส่วนรูปแบบการชำระ
 * - OrderSummaryFooter: ส่วนสรุปยอดและปุ่มชำระ
 */

// ================== TYPES ==================
export type PaymentType = "เงินสด" | "สินเชื่อ FN" | "เงินโอน" | "เช็ค" | "";
export type TransferBank = "KBank" | "BBL" | "";

// ================== STYLES ==================
const labelCls = "text-sm font-medium";
const inputCls = "w-32 text-right p-1 text-sm";

// ================== FINANCE SECTION ==================

interface FinanceSectionProps {
  financeProvider: FinanceProvider;
  setFinanceProvider: (value: FinanceProvider) => void;
  npgPeriod: NpgPeriod;
  setNpgPeriod: (value: NpgPeriod) => void;
  deposit: number;
  setDeposit: (value: number) => void;
  discount: number;
  setDiscount: (value: number) => void;
  down_payment: number;
  setDown_payment: (value: number) => void;
  financeAmount: string;
  interest: string;
  setInterest: (value: string) => void;
  installmentCount: string;
  setInstallmentCount: (value: string) => void;
}

export const FinanceSection: React.FC<FinanceSectionProps> = ({
  financeProvider,
  setFinanceProvider,
  npgPeriod,
  setNpgPeriod,
  deposit,
  setDeposit,
  discount,
  setDiscount,
  down_payment,
  setDown_payment,
  financeAmount,
  interest,
  setInterest,
  installmentCount,
  setInstallmentCount,
}) => {
  return (
    <>
      {/* เลือก Finance Provider */}
      <div className="mt-1 flex justify-between items-center p-1">
        <label className={labelCls}>ไฟแนนซ์</label>
        <Select
          value={financeProvider}
          onValueChange={(val) => setFinanceProvider(val as FinanceProvider)}
        >
          <SelectTrigger className="w-32 text-sm p-1">
            {financeProvider || "เลือก"}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Cathay">Cathay</SelectItem>
            <SelectItem value="ทรัพย์สยาม">ทรัพย์สยาม</SelectItem>
            <SelectItem value="NPG">NPG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ถ้าเลือก NPG ให้เลือกรายปี/รายเดือน */}
      {financeProvider === "NPG" && (
        <div className="mt-1 flex justify-between items-center p-1">
          <label className={labelCls}>ระยะเวลา</label>
          <Select
            value={npgPeriod}
            onValueChange={(val) => setNpgPeriod(val as NpgPeriod)}
          >
            <SelectTrigger className="w-32 text-sm p-1">
              {npgPeriod || "เลือก"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="รายปี">รายปี</SelectItem>
              <SelectItem value="รายเดือน">รายเดือน</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ถ้าเลือก finance provider แล้ว ให้แสดงฟิลด์เพิ่มเติม */}
      {financeProvider && (
        <>
          {/* มัดจำ */}
          <div className="mt-1 flex justify-between items-center p-1">
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

          {/* ส่วนลด */}
          <div className="mt-1 flex justify-between items-center p-1">
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

          {/* เงินดาวน์ */}
          <div className="mt-1 flex justify-between items-center p-1">
            <label className={labelCls}>เงินดาวน์</label>
            <Input
              type="text"
              inputMode="decimal"
              value={numberToInput(down_payment || 0)}
              onChange={(e) =>
                setDown_payment(
                  e.target.value.trim() === "" ? 0 : Number(e.target.value)
                )
              }
              className={inputCls}
              placeholder=""
            />
          </div>

          {/* ยอดจัด (readonly) */}
          <div className="mt-1 flex justify-between items-center p-1">
            <label className={labelCls}>ยอดจัด</label>
            <Input
              type="text"
              inputMode="decimal"
              value={financeAmount}
              readOnly
              className={inputCls}
            />
          </div>

          {/* ดอกเบี้ย */}
          <div className="mt-1 flex justify-between items-center p-1">
            <label className={labelCls}>ดอกเบี้ย</label>
            <Input
              type="text"
              inputMode="decimal"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className={inputCls}
              placeholder=""
            />
          </div>

          {/* จำนวนงวด */}
          <div className="mt-1 flex justify-between items-center p-1">
            <label className={labelCls}>จำนวนงวด</label>
            <Input
              type="text"
              inputMode="decimal"
              value={installmentCount}
              onChange={(e) => setInstallmentCount(e.target.value)}
              className={inputCls}
              placeholder=""
            />
          </div>
        </>
      )}
    </>
  );
};

// ================== PAYMENT TYPE SECTION ==================

interface PaymentTypeSectionProps {
  paymentType: PaymentType;
  setPaymentType: (value: PaymentType) => void;
  transferBank: TransferBank;
  setTransferBank: (value: TransferBank) => void;
  checkNumber: string;
  setCheckNumber: (value: string) => void;
}

export const PaymentTypeSection: React.FC<PaymentTypeSectionProps> = ({
  paymentType,
  setPaymentType,
  transferBank,
  setTransferBank,
  checkNumber,
  setCheckNumber,
}) => {
  // ฟังก์ชันสำหรับ toggle payment type (กดซ้ำเพื่อยกเลิก)
  const handlePaymentTypeToggle = (type: PaymentType) => {
    if (paymentType === type) {
      // ถ้ากดปุ่มเดิมซ้ำ → ยกเลิก
      setPaymentType("");
      setTransferBank("");
      setCheckNumber("");
    } else {
      // ถ้ากดปุ่มใหม่ → เลือกแบบนั้น
      setPaymentType(type);
      if (type !== "เงินโอน") setTransferBank("");
      if (type !== "เช็ค") setCheckNumber("");
    }
  };

  return (
    <div className="p-2">
      <label className="text-sm font-medium mb-2 block">รูปแบบการชำระ</label>
      
      {/* ปุ่มเลือกประเภทการชำระ - เพิ่มเงินสด */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <button
          type="button"
          onClick={() => handlePaymentTypeToggle("เงินสด")}
          className={`text-xs py-2 px-3 rounded border transition-colors ${
            paymentType === "เงินสด"
              ? "bg-green-700 text-white border-green-700"
              : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
          }`}
        >
          เงินสด
        </button>

        <button
          type="button"
          onClick={() => handlePaymentTypeToggle("เงินโอน")}
          className={`text-xs py-2 px-3 rounded border transition-colors ${
            paymentType === "เงินโอน"
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
          }`}
        >
          เงินโอน
        </button>
        
        <button
          type="button"
          onClick={() => handlePaymentTypeToggle("เช็ค")}
          className={`text-xs py-2 px-3 rounded border transition-colors ${
            paymentType === "เช็ค"
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
          }`}
        >
          เช็ค
        </button>
      </div>

      {/* เลือกธนาคาร (สำหรับเงินโอน) */}
      {paymentType === "เงินโอน" && (
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setTransferBank(transferBank === "KBank" ? "" : "KBank")}
            className={`flex-1 text-xs py-2 px-3 rounded border transition-colors ${
              transferBank === "KBank"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
            }`}
          >
            KBank
          </button>
          <button
            type="button"
            onClick={() => setTransferBank(transferBank === "BBL" ? "" : "BBL")}
            className={`flex-1 text-xs py-2 px-3 rounded border transition-colors ${
              transferBank === "BBL"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
            }`}
          >
            BBL
          </button>
        </div>
      )}

      {/* กรอกเลขเช็ค (สำหรับเช็ค) */}
      {paymentType === "เช็ค" && (
        <Input
          type="text"
          placeholder="เลขที่เช็ค"
          value={checkNumber}
          onChange={(e) => setCheckNumber(e.target.value)}
          className="text-sm mb-2"
        />
      )}
    </div>
  );
};

// ================== ORDER SUMMARY FOOTER ==================

interface OrderSummaryFooterProps {
  payment_method: string;
  installmentPerPeriod: string;
  installmentLabel: string;
  totalPayment: number;
  cashTotal: number;
  handleOrderCheckout: () => void;
}

export const OrderSummaryFooter: React.FC<OrderSummaryFooterProps> = ({
  payment_method,
  installmentPerPeriod,
  installmentLabel,
  totalPayment,
  cashTotal,
  handleOrderCheckout,
}) => {
  return (
    <div className="sticky">
      {/* แสดงค่างวดในกรณีไฟแนนซ์ */}
      {payment_method === "ไฟแนนซ์" && installmentPerPeriod && (
        <>
          <div className="w-full border-slate-700 border-b mt-2"></div>
          <div className="flex justify-between p-2 text-lg">
            <span>{installmentLabel}</span>
            <span>฿ {installmentPerPeriod}</span>
          </div>
        </>
      )}

      <div className="w-full border-slate-700 border-b mt-2"></div>

      <div className="flex justify-between p-2 text-lg">
        {payment_method === "ไฟแนนซ์" ? (
          <>
            <span>ยอดชำระรวม</span>
            <span>฿ {totalPayment.toLocaleString()}</span>
          </>
        ) : (
          <>
            <span>ราคารวม</span>
            <span>฿ {cashTotal}</span>
          </>
        )}
      </div>

      {/* ปุ่มชำระเงิน */}
      <Button
        onClick={handleOrderCheckout}
        className="bg-slate-900 hover:bg-slate-950 p-2 px-9 rounded-lg text-slate-50 text-lg w-full"
      >
        สั่งซื้อชำระเงิน
      </Button>
    </div>
  );
};