import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Banknote, Landmark, FileText, ArrowLeftRight } from "lucide-react";
import {
  FinanceProvider,
  NpgPeriod,
  numberToInput,
  toNumber,
  calculateDownPaymentInstallment,
} from "./Financecalculations";

/**
 * ไฟล์รวม UI การชำระเงินทั้งหมด
 * - ชิ้นส่วน UI ที่ใช้ร่วมกัน: StepLabel / FormRow / SegButtons / NumberInput
 * - FinanceSection: ส่วนไฟแนนซ์
 * - PaymentTypeSection: ส่วนรูปแบบการชำระ
 * - OrderSummaryFooter: ส่วนสรุปยอดและปุ่มชำระ (ขาย)
 * - SummaryFooterShell: กรอบท้ายการ์ดสีกรม (ใช้ทั้งขาย/บริการ)
 */

// ================== TYPES ==================
// ✅ "แบ่งจ่าย" = จ่ายเงินสดส่วนหนึ่ง + โอนส่วนที่เหลือ (ยอดเงินสดเก็บใน cash_amount ใช้กับระบบส่งเงินสด)
export type PaymentType = "เงินสด" | "สินเชื่อ FN" | "เงินโอน" | "เช็ค" | "แบ่งจ่าย" | "";
export type TransferBank = "KBank" | "BBL" | "";

// ================== ชิ้นส่วน UI ร่วม ==================

/** หัวข้อขั้นตอน เช่น (1) ลูกค้า */
export const StepLabel = ({
  step,
  label,
  required,
  hint,
}: {
  step?: number;
  label: string;
  required?: boolean;
  hint?: string;
}) => (
  <div className="flex items-center gap-1.5 text-sm text-slate-700 mt-4 mb-1.5">
    {step !== undefined && (
      <span className="w-[18px] h-[18px] rounded-md bg-[#1e2432] text-white text-xs grid place-items-center">
        {step}
      </span>
    )}
    <span>{label}</span>
    {required && <span className="text-orange-500">*</span>}
    {hint && <span className="text-orange-500">{hint}</span>}
  </div>
);

/** แถว label ซ้าย / ช่องกรอกขวา ภายในกล่องขาว */
export const FormRow = ({
  label,
  children,
  sub,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  sub?: boolean;
}) => (
  <div
    className={`flex justify-between items-center gap-2 py-1.5 border-t border-slate-100 first:border-t-0 ${
      sub ? "text-xs text-slate-600" : "text-sm"
    }`}
  >
    <span>{label}</span>
    {children}
  </div>
);

/** ปุ่มสลับแบบแคปซูล (เช่น เงินสด/ไฟแนนซ์, S/M/L) */
export function SegButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex bg-slate-100 rounded-lg p-[3px] gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`text-[13px] px-3 py-1 rounded-md transition-colors ${
            value === opt.value
              ? "bg-white text-[#1e2432] font-semibold shadow-sm"
              : "text-slate-600 hover:text-slate-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const numCls = "w-36 h-9 text-right text-sm bg-white";

/** ช่องกรอกตัวเลข (เว้นว่าง = 0) */
const NumberInput = ({
  value,
  onChange,
  className = numCls,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  placeholder?: string;
}) => (
  <Input
    type="text"
    inputMode="decimal"
    value={numberToInput(value || 0)}
    onChange={(e) => onChange(e.target.value.trim() === "" ? 0 : Number(e.target.value))}
    className={className}
    placeholder={placeholder}
  />
);

// ================== FINANCE SECTION ==================

interface FinanceSectionProps {
  financeProvider: FinanceProvider;
  setFinanceProvider: (value: FinanceProvider) => void;
  npgPeriod: NpgPeriod;
  setNpgPeriod: (value: NpgPeriod) => void;
  bikeSize: "S" | "M" | "L" | "";
  setBikeSize: (value: "S" | "M" | "L" | "") => void;
  deposit: number;
  setDeposit: (value: number) => void;
  // ✅ เลขใบมัดจำ - เดิมมีแค่ตอนเงินสด ไฟแนนซ์ไม่มีช่องให้กรอก (optional กันไฟล์อื่นที่เรียกใช้พัง)
  depositReceiptNo?: string;
  setDepositReceiptNo?: (value: string) => void;
  discount: number;
  setDiscount: (value: number) => void;
  down_payment: number;
  setDown_payment: (value: number) => void;
  financeAmount: string;
  interest: string;
  setInterest: (value: string) => void;
  installmentCount: string;
  setInstallmentCount: (value: string) => void;

  // ✅ ผ่อนดาวน์ - ลูกค้าไฟแนนซ์อยู่แล้ว แต่ขอผ่อนเงินดาวน์เองด้วย จะไปขึ้นบัญชี NPG แยกตอน checkout
  // งวดแรกให้กรอกเอง (บางคนจ่ายมาก/น้อยกว่าที่คำนวณเป๊ะๆ) ส่วนที่เหลือค่อยหารเป็นงวดๆ ต่อไป
  downPaymentInstallment: boolean;
  setDownPaymentInstallment: (value: boolean) => void;
  downPaymentFirstPaymentAmount: number;
  setDownPaymentFirstPaymentAmount: (value: number) => void;
  downPaymentInstallmentCount: string;
  setDownPaymentInstallmentCount: (value: string) => void;
  downPaymentInterestRate: string;
  setDownPaymentInterestRate: (value: string) => void;
  // ✅ วันครบกำหนดชำระงวดถัดไป (งวดที่ 2) - แก้เองได้ เพราะลูกค้าไม่ได้จ่ายตรง 30 วันเป๊ะทุกคน
  downPaymentNextPaymentDate: string;
  setDownPaymentNextPaymentDate: (value: string) => void;
}

const FINANCE_PROVIDERS: FinanceProvider[] = [
  "Cathay",
  "ทรัพย์สยาม",
  "NPG",
  "Summit",
  "S Leasing",
  "CIMB",
  "World Lease",
  "เงินติดล้อ",
];

/**
 * ฟิลด์ไฟแนนซ์ - render เป็นแถวต่อในกล่องราคาของ SaleOrderForm
 */
export const FinanceSection: React.FC<FinanceSectionProps> = ({
  financeProvider,
  setFinanceProvider,
  npgPeriod,
  setNpgPeriod,
  bikeSize,
  setBikeSize,
  deposit,
  setDeposit,
  depositReceiptNo = "",
  setDepositReceiptNo,
  discount,
  setDiscount,
  down_payment,
  setDown_payment,
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
}) => {
  // ✅ ใช้สูตรกลางจาก Financecalculations (เดิมเขียนซ้ำกับ index.tsx)
  const { remainingBalance: downPaymentRemainingBalance, perRemainingInstallment: downPaymentPerRemainingInstallment } =
    React.useMemo(
      () =>
        calculateDownPaymentInstallment(
          down_payment || 0,
          downPaymentFirstPaymentAmount || 0,
          downPaymentInstallmentCount,
          downPaymentInterestRate
        ),
      [down_payment, downPaymentFirstPaymentAmount, downPaymentInstallmentCount, downPaymentInterestRate]
    );
  const firstPaymentTooHigh = (downPaymentFirstPaymentAmount || 0) > (down_payment || 0);

  const toggleDownPaymentInstallment = (next: boolean) => {
    setDownPaymentInstallment(next);
    // เปิดครั้งแรก ตั้งงวดแรกเท่ากับเงินดาวน์เต็มจำนวนไว้ก่อน แก้เป็นยอดที่รับจริงได้ทันที
    if (next && downPaymentFirstPaymentAmount === 0) {
      setDownPaymentFirstPaymentAmount(down_payment || 0);
    }
  };

  return (
    <>
      {/* เลือก Finance Provider */}
      <FormRow label="ไฟแนนซ์">
        <Select value={financeProvider} onValueChange={(val) => setFinanceProvider(val as FinanceProvider)}>
          <SelectTrigger className="w-36 h-9 text-sm bg-white">{financeProvider || "เลือก"}</SelectTrigger>
          <SelectContent>
            {FINANCE_PROVIDERS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormRow>

      {/* ✅ ขนาดรถ S/M/L - เฉพาะไฟแนนซ์ที่ไม่ใช่ NPG (L = ดอกเบี้ยที่กรอกเป็นอัตรารายปี หาร 12 ก่อนคิดต่อเดือน)
          ตั้งค่าเริ่มต้นจากรุ่นรถให้แล้ว แต่แก้เองได้เผื่อเดา cc ผิด / กดซ้ำเพื่อยกเลิก */}
      {financeProvider && financeProvider !== "NPG" && (
        <FormRow label="ขนาดรถ">
          <SegButtons
            options={[
              { value: "S", label: "S" },
              { value: "M", label: "M" },
              { value: "L", label: "L" },
            ]}
            value={bikeSize}
            onChange={(size) => setBikeSize(bikeSize === size ? "" : size)}
          />
        </FormRow>
      )}

      {/* ✅ รายปี/รายเดือน - เฉพาะไฟแนนซ์ NPG */}
      {financeProvider === "NPG" && (
        <FormRow label="ประเภทดอกเบี้ย">
          <SegButtons
            options={[
              { value: "รายเดือน" as NpgPeriod, label: "รายเดือน" },
              { value: "รายปี" as NpgPeriod, label: "รายปี" },
            ]}
            value={npgPeriod}
            onChange={(v) => setNpgPeriod(v)}
          />
        </FormRow>
      )}

      {financeProvider && (
        <>
          <FormRow label="มัดจำ">
            <NumberInput value={deposit} onChange={setDeposit} />
          </FormRow>

          {/* ✅ เลขใบมัดจำ (ไฟแนนซ์) - แสดงเมื่อมัดจำ > 0 เหมือนฝั่งเงินสด */}
          {deposit > 0 && setDepositReceiptNo && (
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
            <NumberInput value={discount} onChange={setDiscount} />
          </FormRow>

          <FormRow label="เงินดาวน์">
            <NumberInput value={down_payment} onChange={setDown_payment} />
          </FormRow>

          {/* ✅ ผ่อนดาวน์ - ⚠️ ห้ามใช้กับไฟแนนซ์ NPG (NPGAccount ผูก Order แบบ OneToOne ชนบัญชีหลัก ระบบล่ม) */}
          {financeProvider !== "NPG" && (
            <FormRow label="ผ่อนดาวน์">
              <SegButtons
                options={[
                  { value: "off", label: "ไม่ผ่อน" },
                  { value: "on", label: "ผ่อน" },
                ]}
                value={downPaymentInstallment ? "on" : "off"}
                onChange={(v) => toggleDownPaymentInstallment(v === "on")}
              />
            </FormRow>
          )}

          {financeProvider !== "NPG" && downPaymentInstallment && (
            <div className="my-1.5 px-2.5 py-1 bg-orange-50 rounded-xl">
              <FormRow label="งวดแรก (จ่ายวันนี้)">
                <NumberInput
                  value={downPaymentFirstPaymentAmount}
                  onChange={setDownPaymentFirstPaymentAmount}
                  className="w-32 h-8 text-right text-sm bg-white"
                  placeholder="ยอดที่รับจริง"
                />
              </FormRow>
              {firstPaymentTooHigh && (
                <p className="text-xs text-red-600 pb-1">
                  งวดแรกมากกว่าเงินดาวน์ (฿{(down_payment || 0).toLocaleString()})
                </p>
              )}
              <FormRow label="ยอดคงเหลือหลังงวดแรก" sub>
                <span>฿ {downPaymentRemainingBalance.toLocaleString()}</span>
              </FormRow>
              <FormRow label="จำนวนงวดที่เหลือ">
                <Input
                  type="text"
                  inputMode="numeric"
                  value={downPaymentInstallmentCount}
                  onChange={(e) => setDownPaymentInstallmentCount(e.target.value)}
                  placeholder="เช่น 3"
                  className="w-32 h-8 text-right text-sm bg-white"
                />
              </FormRow>
              <FormRow label="ดอกเบี้ย (%/เดือน)">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={downPaymentInterestRate}
                  onChange={(e) => setDownPaymentInterestRate(e.target.value)}
                  placeholder="0"
                  className="w-32 h-8 text-right text-sm bg-white"
                />
              </FormRow>
              {/* ✅ วันครบกำหนดงวดถัดไป - แก้เองได้ (ลูกค้าบางคนนัดจ่าย 15 วันหลังซื้อ) */}
              <FormRow label="ครบกำหนดงวดถัดไป">
                <Input
                  type="date"
                  value={downPaymentNextPaymentDate}
                  onChange={(e) => setDownPaymentNextPaymentDate(e.target.value)}
                  className="w-40 h-8 text-sm bg-white"
                />
              </FormRow>
              <FormRow label={<b>ค่างวดถัดไป (งวด 2 เป็นต้นไป)</b>}>
                <b className="text-orange-700">
                  {downPaymentPerRemainingInstallment
                    ? `฿ ${downPaymentPerRemainingInstallment.toLocaleString()}`
                    : "-"}
                </b>
              </FormRow>
              <p className="text-xs text-slate-600 pb-1.5">
                * งวดที่เหลือ ระบบจะสร้างบัญชีผ่อนดาวน์ไว้ในเมนู NPG ให้อัตโนมัติหลังบันทึกออเดอร์
              </p>
            </div>
          )}

          {/* ยอดจัด (readonly) */}
          <FormRow label="ยอดจัด">
            <Input
              type="text"
              value={financeAmount ? Number(financeAmount).toLocaleString() : ""}
              readOnly
              className="w-36 h-9 text-right text-sm bg-slate-100 text-slate-600"
            />
          </FormRow>

          <FormRow label="ดอกเบี้ย %">
            <Input
              type="text"
              inputMode="decimal"
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              className={numCls}
              placeholder="ไม่มีให้ใส่ 0"
            />
          </FormRow>

          <FormRow label="จำนวนงวด">
            <Input
              type="text"
              inputMode="decimal"
              value={installmentCount}
              onChange={(e) => setInstallmentCount(e.target.value)}
              className={numCls}
            />
          </FormRow>
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
  // ✅ แบ่งจ่าย - ยอดเงินสด (ที่เหลือ = โอน) + ยอดชำระรวมไว้คำนวณส่วนโอน
  splitCash?: string;
  setSplitCash?: (value: string) => void;
  total?: number;
  // เลขขั้นตอนที่โชว์บนหัวข้อ
  step?: number;
}

const PAYMENT_OPTIONS: { type: PaymentType; label: string; icon: React.ReactNode; activeCls: string }[] = [
  { type: "เงินสด", label: "เงินสด", icon: <Banknote size={18} />, activeCls: "bg-[#1e2432] border-[#1e2432] text-white" },
  { type: "เงินโอน", label: "เงินโอน", icon: <Landmark size={18} />, activeCls: "bg-[#1e2432] border-[#1e2432] text-white" },
  { type: "เช็ค", label: "เช็ค", icon: <FileText size={18} />, activeCls: "bg-[#1e2432] border-[#1e2432] text-white" },
  { type: "แบ่งจ่าย", label: "แบ่งจ่าย", icon: <ArrowLeftRight size={18} />, activeCls: "bg-orange-500 border-orange-500 text-white" },
];

export const PaymentTypeSection: React.FC<PaymentTypeSectionProps> = ({
  paymentType,
  setPaymentType,
  transferBank,
  setTransferBank,
  checkNumber,
  setCheckNumber,
  splitCash = "",
  setSplitCash,
  total = 0,
  step,
}) => {
  const splitCashNumber = toNumber(splitCash);
  const splitTransfer = Math.max((total || 0) - splitCashNumber, 0);
  const splitInvalid =
    paymentType === "แบ่งจ่าย" && splitCash.trim() !== "" && (splitCashNumber <= 0 || splitCashNumber >= total);

  // toggle payment type (กดซ้ำเพื่อยกเลิก)
  const handlePaymentTypeToggle = (type: PaymentType) => {
    if (paymentType === type) {
      setPaymentType("");
      setTransferBank("");
      setCheckNumber("");
      setSplitCash?.("");
    } else {
      setPaymentType(type);
      if (type !== "เงินโอน" && type !== "แบ่งจ่าย") setTransferBank("");
      if (type !== "เช็ค") setCheckNumber("");
      if (type !== "แบ่งจ่าย") setSplitCash?.("");
    }
  };

  // แบ่งจ่ายโชว์เฉพาะตอนส่ง setSplitCash มา (เหมือนเดิม)
  const options = PAYMENT_OPTIONS.filter((o) => o.type !== "แบ่งจ่าย" || setSplitCash);

  return (
    <div>
      <StepLabel step={step} label="รูปแบบการชำระ" required />

      <div className={`grid ${options.length === 4 ? "grid-cols-4" : "grid-cols-3"} gap-1.5`}>
        {options.map((o) => (
          <button
            key={o.type}
            type="button"
            onClick={() => handlePaymentTypeToggle(o.type)}
            className={`flex flex-col items-center gap-1 text-xs py-2 rounded-xl border transition-colors ${
              paymentType === o.type ? o.activeCls : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>

      {/* ✅ แบ่งจ่าย: กรอกยอดเงินสด ระบบคิดส่วนโอนให้ (ยอดรวม - เงินสด) */}
      {paymentType === "แบ่งจ่าย" && setSplitCash && (
        <div className="mt-2 px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200">
          <FormRow label="เงินสด">
            <Input
              type="text"
              inputMode="decimal"
              value={splitCash}
              onChange={(e) => setSplitCash(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="0"
              className="w-32 h-8 text-right text-sm bg-white"
            />
          </FormRow>
          <FormRow label="เงินโอน">
            <b>฿ {splitTransfer.toLocaleString()}</b>
          </FormRow>
          {splitInvalid && (
            <p className="text-xs text-red-600 pb-1">
              ยอดเงินสดต้องมากกว่า 0 และน้อยกว่ายอดชำระรวม ฿{(total || 0).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* เลือกธนาคาร (เงินโอน / ส่วนโอนของแบ่งจ่าย) */}
      {(paymentType === "เงินโอน" || paymentType === "แบ่งจ่าย") && (
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <button
            type="button"
            onClick={() => setTransferBank(transferBank === "KBank" ? "" : "KBank")}
            className={`text-sm py-1.5 rounded-lg border transition-colors ${
              transferBank === "KBank"
                ? "bg-green-600 text-white border-green-600"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
            }`}
          >
            KBank
          </button>
          <button
            type="button"
            onClick={() => setTransferBank(transferBank === "BBL" ? "" : "BBL")}
            className={`text-sm py-1.5 rounded-lg border transition-colors ${
              transferBank === "BBL"
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
            }`}
          >
            BBL
          </button>
        </div>
      )}

      {/* เลขเช็ค */}
      {paymentType === "เช็ค" && (
        <Input
          type="text"
          placeholder="เลขที่เช็ค"
          value={checkNumber}
          onChange={(e) => setCheckNumber(e.target.value)}
          className="text-sm mt-2 bg-white"
        />
      )}
    </div>
  );
};

// ================== SUMMARY FOOTER (กรอบสีกรม ใช้ร่วม ขาย/บริการ) ==================

export interface SummaryLine {
  label: string;
  amount: number;
  /** true = แสดงในวงเล็บ (ข้อมูลประกอบ ไม่ได้รวมในยอด) */
  info?: boolean;
}

export const SummaryFooterShell = ({
  lines,
  totalLabel,
  total,
  buttonLabel,
  onSubmit,
  isSubmitting = false,
  hint,
}: {
  lines: SummaryLine[];
  totalLabel: string;
  total: number;
  buttonLabel: string;
  onSubmit: () => void;
  isSubmitting?: boolean;
  hint?: string;
}) => (
  <div className="relative overflow-hidden bg-[#1e2432] text-white px-4 pt-3.5 pb-4">
    <div className="absolute -right-8 top-0 w-24 h-1.5 bg-orange-500 -skew-x-[30deg]" />

    {lines.map((l, idx) => (
      <div key={`${idx}-${l.label}`} className="flex justify-between text-xs text-slate-200 py-0.5">
        <span className="truncate pr-2">{l.label}</span>
        <span className="whitespace-nowrap">
          {l.info
            ? `(฿ ${l.amount.toLocaleString()})`
            : l.amount < 0
            ? `− ฿ ${Math.abs(l.amount).toLocaleString()}`
            : `฿ ${l.amount.toLocaleString()}`}
        </span>
      </div>
    ))}

    <div
      className={`flex justify-between items-baseline mb-2.5 ${
        lines.length > 0 ? "mt-2 pt-2 border-t border-white/10" : ""
      }`}
    >
      <span className="text-sm">{totalLabel}</span>
      <b className="text-2xl font-bold text-orange-400">฿ {total.toLocaleString()}</b>
    </div>

    <button
      type="button"
      onClick={onSubmit}
      disabled={isSubmitting}
      className="w-full rounded-xl py-3 text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:bg-slate-600 disabled:text-slate-200 disabled:cursor-wait"
    >
      {isSubmitting ? "กำลังบันทึก..." : buttonLabel}
    </button>

    {/* บอกล่วงหน้าว่ายังขาดอะไร (กดได้ แต่จะเตือนแบบเดียวกัน) */}
    <p className="text-xs text-orange-300 text-center mt-1.5 min-h-[14px]">{hint}</p>
  </div>
);

// ================== ORDER SUMMARY FOOTER (ขาย) ==================

interface OrderSummaryFooterProps {
  payment_method: string;
  installmentPerPeriod: string;
  installmentLabel: string;
  totalPayment: number;
  cashTotal: number;
  handleOrderCheckout: () => void;
  // ✅ ผ่อนดาวน์ - ยอดที่โชว์คือ "งวดแรก" ไม่ใช่ดาวน์เต็ม ต้องเปลี่ยน label ให้ตรง
  downPaymentInstallment?: boolean;
  // ✅ กำลังบันทึก - ล็อกปุ่มกันกดซ้ำ
  isSubmitting?: boolean;
  // ✅ รายละเอียดที่มาของยอด (optional)
  sellPrice?: number;
  totalAdditionalFees?: number;
  discount?: number;
  deposit?: number;
  downPaymentToday?: number;
  // ✅ ข้อความบอกว่ายังขาดอะไร
  hint?: string;
}

export const OrderSummaryFooter: React.FC<OrderSummaryFooterProps> = ({
  payment_method,
  installmentPerPeriod,
  installmentLabel,
  totalPayment,
  cashTotal,
  handleOrderCheckout,
  downPaymentInstallment = false,
  isSubmitting = false,
  sellPrice = 0,
  totalAdditionalFees = 0,
  discount = 0,
  deposit = 0,
  downPaymentToday = 0,
  hint,
}) => {
  const isFinance = payment_method === "ไฟแนนซ์";
  const lines: SummaryLine[] = [];

  if (isFinance) {
    lines.push({ label: downPaymentInstallment ? "ดาวน์งวดแรก" : "เงินดาวน์", amount: downPaymentToday });
    if (totalAdditionalFees) lines.push({ label: "ค่าใช้จ่ายเพิ่มเติม", amount: totalAdditionalFees });
    if (deposit) lines.push({ label: "มัดจำ", amount: -deposit });
    if (installmentPerPeriod) {
      lines.push({ label: `${installmentLabel} (ไฟแนนซ์)`, amount: Number(installmentPerPeriod) || 0, info: true });
    }
  } else if (payment_method === "เงินสด") {
    lines.push({ label: "ราคาขาย", amount: sellPrice });
    if (totalAdditionalFees) lines.push({ label: "ค่าใช้จ่ายเพิ่มเติม", amount: totalAdditionalFees });
    if (discount) lines.push({ label: "ส่วนลด", amount: -discount });
    if (deposit) lines.push({ label: "มัดจำ", amount: -deposit });
  }

  return (
    <SummaryFooterShell
      lines={lines}
      totalLabel={isFinance ? (downPaymentInstallment ? "ชำระวันนี้ (งวดแรก)" : "ยอดชำระรวม") : "ราคารวม"}
      total={isFinance ? totalPayment : cashTotal}
      buttonLabel="สั่งซื้อชำระเงิน"
      onSubmit={handleOrderCheckout}
      isSubmitting={isSubmitting}
      hint={hint}
    />
  );
};