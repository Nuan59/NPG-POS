"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type FinanceProvider = "Cathay" | "ทรัพย์สยาม" | "NPG" | "";
type NpgPeriod = "รายปี" | "รายเดือน" | "";

const toNumber = (s: string): number => {
  const t = s.trim();
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

export default function InstallmentCalculator() {
  const [sellPrice, setSellPrice] = useState<string>("");
  const [discount, setDiscount] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);

  const [financeProvider, setFinanceProvider] = useState<FinanceProvider>("");
  const [npgPeriod, setNpgPeriod] = useState<NpgPeriod>("");

  const [interest, setInterest] = useState<string>("");
  const [installmentCount, setInstallmentCount] = useState<string>("");

  const [financeAmount, setFinanceAmount] = useState<string>("");
  const [installmentPerPeriod, setInstallmentPerPeriod] = useState<string>("");

  // =========================
  // ยอดจัด = ขาย - ส่วนลด - เงินดาวน์
  // =========================
  const computedFinanceAmount = useMemo(() => {
    const sell = toNumber(sellPrice);
    const disc = discount || 0;
    const down = downPayment || 0;
    const v = sell - disc - down;
    return v > 0 ? v : 0;
  }, [sellPrice, discount, downPayment]);

  useEffect(() => {
    const sellEmpty = sellPrice.trim() === "";
    const discEmpty = (discount || 0) === 0;
    const downEmpty = (downPayment || 0) === 0;

    if (sellEmpty && discEmpty && downEmpty) {
      setFinanceAmount("");
      return;
    }
    setFinanceAmount(String(computedFinanceAmount));
  }, [sellPrice, discount, downPayment, computedFinanceAmount]);

  // =========================
  // ค่างวด (logic เดิม + ปัดเศษ)
  // =========================
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
    const months = isNpgYearly ? count * 12 : count;

    if (months <= 0) {
      setInstallmentPerPeriod("");
      return;
    }

    const ratePctPerMonth = toNumber(interest);
    const interestPerMonth = principal * (ratePctPerMonth / 100);
    const totalInterest = interestPerMonth * months;

    const perMonth = (principal + totalInterest) / months;
    const perPeriod = isNpgYearly ? perMonth * 12 : perMonth;

    // ✅ ปัดเศษ: < 0.5 ปัดลง, >= 0.5 ปัดขึ้น
    const rounded = Math.round(perPeriod);

    setInstallmentPerPeriod(
      Number.isFinite(rounded) ? rounded.toFixed(2) : ""
    );
  }, [financeAmount, installmentCount, interest, financeProvider, npgPeriod]);

  useEffect(() => {
    if (financeProvider !== "NPG") setNpgPeriod("");
  }, [financeProvider]);

  const labelCls = "text-lg";
  const inputCls =
    "bg-slate-700 my-0 focus:ring-0 border-none w-full max-w-[280px] rounded-lg text-base";
  const selectTriggerCls =
    "bg-slate-700 my-0 focus:ring-0 border-none w-full max-w-[280px] rounded-lg text-base";

  // ✅ Layout row ใหม่: label + field อยู่ใกล้กันขึ้น
  const rowCls =
    "grid grid-cols-[180px_minmax(0,280px)] items-center gap-6 p-1";

  const clearAll = () => {
    setSellPrice("");
    setDiscount(0);
    setDownPayment(0);
    setFinanceProvider("");
    setNpgPeriod("");
    setInterest("");
    setInstallmentCount("");
    setFinanceAmount("");
    setInstallmentPerPeriod("");
  };

  return (
    <div className="m-10 p-10 bg-slate-800 text-slate-50 rounded-xl shadow-md">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">คำนวณค่างวด</h1>
        <Button variant="secondary" onClick={clearAll}>
          ล้างค่า
        </Button>
      </div>

      <Separator className="my-5 opacity-40" />

      <div className="flex flex-col gap-3">
        <div className={rowCls}>
          <label className={labelCls}>เลือกไฟแนนซ์</label>
          <Select
            value={financeProvider}
            onValueChange={(v) => setFinanceProvider(v as FinanceProvider)}
          >
            <SelectTrigger className={selectTriggerCls}>
              {financeProvider || "Select"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cathay">Cathay</SelectItem>
              <SelectItem value="ทรัพย์สยาม">ทรัพย์สยาม</SelectItem>
              <SelectItem value="NPG">NPG</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {financeProvider === "NPG" && (
          <div className={rowCls}>
            <label className={labelCls}>เลือก</label>
            <Select
              value={npgPeriod}
              onValueChange={(v) => setNpgPeriod(v as NpgPeriod)}
            >
              <SelectTrigger className={selectTriggerCls}>
                {npgPeriod || "Select"}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="รายเดือน">รายเดือน</SelectItem>
                <SelectItem value="รายปี">รายปี</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className={rowCls}>
          <label className={labelCls}>ขาย</label>
          <Input
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            inputMode="decimal"
            className={inputCls}
          />
        </div>

        <div className={rowCls}>
          <label className={labelCls}>ส่วนลด</label>
          <Input
            value={discount === 0 ? "" : String(discount)}
            onChange={(e) =>
              setDiscount(
                e.target.value.trim() === "" ? 0 : Number(e.target.value)
              )
            }
            inputMode="decimal"
            className={inputCls}
          />
        </div>

        <div className={rowCls}>
          <label className={labelCls}>เงินดาวน์</label>
          <Input
            value={downPayment === 0 ? "" : String(downPayment)}
            onChange={(e) =>
              setDownPayment(
                e.target.value.trim() === "" ? 0 : Number(e.target.value)
              )
            }
            inputMode="decimal"
            className={inputCls}
          />
        </div>

        <div className={rowCls}>
          <label className={labelCls}>ยอดจัด</label>
          <Input value={financeAmount} readOnly className={inputCls} />
        </div>

        <div className={rowCls}>
          <label className={labelCls}>ดอกเบี้ย</label>
          <Input
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            inputMode="decimal"
            className={inputCls}
          />
        </div>

        <div className={rowCls}>
          <label className={labelCls}>จำนวนงวด</label>
          <Input
            value={installmentCount}
            onChange={(e) => setInstallmentCount(e.target.value)}
            inputMode="numeric"
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-slate-900/40 p-4 flex items-center justify-between">
        <span className="text-lg font-extrabold">ค่างวด</span>
        <span className="text-lg font-extrabold">
          {installmentPerPeriod ? `฿ ${installmentPerPeriod}` : "-"}
        </span>
      </div>
    </div>
  );
}