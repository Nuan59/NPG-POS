"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { IBike } from "@/types/Bike";
import { getBike } from "@/services/InventoryService";
import { OrderContext } from "@/context/OrderContext";

// ✅ shared/ - ใช้ร่วมกันทุกประเภทธุรกรรม
import OrderCustomer from "./shared/OrderCustomer";
import OrderBike from "./shared/OrderBike";
import AdditionalFeeDialog from "./shared/AdditionalFeeDialog";
import OrderFee from "./shared/OrderFee";
import OrderGiftDialog from "./shared/OrderGiftDialog";
import OrderGift from "./shared/OrderGift";
import TransactionTypeTabs from "./shared/TransactionTypeTabs";
import {
  FinanceProvider,
  NpgPeriod,
  useFinanceCalculations,
  calculateTotalAdditionalFees,
  calculateCashTotal,
  calculateTotalPayment,
  isBigBike,
  toNumber,
  roundByMethod,
} from "./shared/Financecalculations";
import {
  PaymentType,
  TransferBank,
  PaymentTypeSection,
  OrderSummaryFooter,
} from "./shared/PaymentSection";

// ✅ sale/ - เฉพาะประเภท "ขาย"
import SaleOrderForm from "./sale/SaleOrderForm";
import { useSaleOrderCheckout } from "./sale/useSaleOrderCheckout";

// ✅ service/ - เฉพาะประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
import ServiceOrderForm from "./service/ServiceOrderForm";
import ServiceOrderFooter from "./service/ServiceOrderFooter";
import { useServiceOrderCheckout } from "./service/useServiceOrderCheckout";
import type { ServiceItem } from "./service/ServiceItems";

import { TransactionType } from "./types";

const OrderCard = () => {
  const {
    orderBike,
    bikePrice,
    orderCustomer,
    orderAdditionalFees,
    orderGifts,
    totalPrice,
    discount,
    down_payment,
    payment_method,
    notes,
    setDiscount,
    setDown_payment,
    setPayment_method,
    resetOrder,
    removeBikeFromOrder,
  } = useContext(OrderContext);

  const [bikeDisplay, setBikeDisplay] = useState<IBike | null>(orderBike);

  // ✅ ประเภทธุรกรรม - ขาย / ซ่อม / ต่อภาษี+พรบ / อื่นๆ
  const [transactionType, setTransactionType] = useState<TransactionType>("ขาย");
  const [otherTransactionDetail, setOtherTransactionDetail] = useState<string>("");

  // ✅ ฟอร์มแบบง่ายสำหรับ ซ่อม / ต่อภาษี+พรบ / อื่นๆ (ไม่มีไฟแนนซ์)
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [serviceDetail, setServiceDetail] = useState<string>("");

  // ขาย = ราคาตั้ง
  const [sellPrice, setSellPrice] = useState<string>("");

  // มัดจำ (Deposit)
  const [deposit, setDeposit] = useState<number>(0);
  const [depositReceiptNo, setDepositReceiptNo] = useState<string>("");

  // วิธีการชำระเงิน (ใช้ร่วมกันทั้งขาย/ซ่อม/ต่อภาษี+พรบ/อื่นๆ)
  const [paymentType, setPaymentType] = useState<PaymentType>("");
  const [transferBank, setTransferBank] = useState<TransferBank>("");
  const [checkNumber, setCheckNumber] = useState<string>("");

  // Finance controls (เฉพาะ "ขาย")
  const [financeProvider, setFinanceProvider] = useState<FinanceProvider>("");
  const [npgPeriod, setNpgPeriod] = useState<NpgPeriod>("");

  // ✅ ขนาดรถ S/M/L - มีผลเฉพาะไฟแนนซ์ที่ไม่ใช่ NPG (L = ตีความดอกเบี้ยที่กรอกเป็นอัตรารายปี)
  // ตั้งค่าเริ่มต้นอัตโนมัติจากชื่อ/รหัสรุ่น แต่ผู้ใช้เลือกเองทับได้เสมอ (เผื่อเดา cc ผิด)
  const [bikeSize, setBikeSize] = useState<"S" | "M" | "L" | "">("");

  // ✅ ผ่อนดาวน์ (เฉพาะไฟแนนซ์) - ลูกค้าจ่ายงวดแรกวันนี้ (กรอกเอง เพราะบางคนจ่ายมาก/น้อยกว่าที่คำนวณเป๊ะๆ)
  // ส่วนที่เหลือ (เงินดาวน์ - งวดแรก) ค่อยหารเป็นงวดๆ ไปขึ้นบัญชี NPG แยกตอน checkout
  const [downPaymentInstallment, setDownPaymentInstallment] = useState<boolean>(false);
  const [downPaymentFirstPaymentAmount, setDownPaymentFirstPaymentAmount] = useState<number>(0);
  const [downPaymentInstallmentCount, setDownPaymentInstallmentCount] = useState<string>("");
  const [downPaymentInterestRate, setDownPaymentInterestRate] = useState<string>("");
  // ✅ วันครบกำหนดงวดถัดไป - ค่าเริ่มต้น = วันนี้ + 30 วัน แก้เองได้ (ลูกค้าบางคนนัดจ่าย 15 วันหลังซื้อ ไม่ตรง 30 วันเป๊ะ)
  const [downPaymentNextPaymentDate, setDownPaymentNextPaymentDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // ✅ ยอดคงเหลือหลังหักงวดแรกที่กรอกเอง
  const downPaymentRemainingBalance = useMemo(() => {
    const total = down_payment || 0;
    const first = downPaymentFirstPaymentAmount || 0;
    return Math.max(total - first, 0);
  }, [down_payment, downPaymentFirstPaymentAmount]);

  // ✅ ค่างวดที่เหลือต่องวด (งวดที่ 2 เป็นต้นไป) - คำนวณแบบเดียวกับใน FinanceSection
  const downPaymentPerRemainingInstallment = useMemo(() => {
    const count = toNumber(downPaymentInstallmentCount);
    if (downPaymentRemainingBalance <= 0 || count <= 0) return 0;

    const rate = toNumber(downPaymentInterestRate);
    const interestPerMonth = downPaymentRemainingBalance * (rate / 100);
    const total = downPaymentRemainingBalance + interestPerMonth * count;
    return roundByMethod(total / count, "standard");
  }, [downPaymentRemainingBalance, downPaymentInstallmentCount, downPaymentInterestRate]);

  useEffect(() => {
    if (bikeDisplay) {
      setBikeSize(isBigBike(bikeDisplay.model_name, bikeDisplay.model_code) ? "L" : "S");
    } else {
      setBikeSize("");
    }
  }, [bikeDisplay]);

  // ✅ ปิดผ่อนดาวน์อัตโนมัติถ้าเปลี่ยนไฟแนนซ์เป็น NPG - กันชนกับ NPGAccount หลัก (OneToOneField)
  // ที่เคยทำให้ระบบล่มตอน checkout เพราะพยายามสร้างบัญชี NPG 2 บัญชีให้ order เดียวกัน
  useEffect(() => {
    if (financeProvider === "NPG" && downPaymentInstallment) {
      setDownPaymentInstallment(false);
    }
  }, [financeProvider, downPaymentInstallment]);

  const {
    financeAmount,
    interest,
    setInterest,
    installmentCount,
    setInstallmentCount,
    installmentPerPeriod,
    installmentLabel,
  } = useFinanceCalculations({
    sellPrice,
    discount: discount || 0,
    down_payment: down_payment || 0,
    financeProvider,
    npgPeriod,
    roundingMethod: "standard",
    isBigBike: bikeSize === "L",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (orderBike) {
        const bike = await getBike(orderBike.id);
        setBikeDisplay(bike);
      }
    };
    fetchData();
  }, [orderBike, totalPrice]);

  const totalAdditionalFees = useMemo(
    () => calculateTotalAdditionalFees(orderAdditionalFees),
    [orderAdditionalFees]
  );

  const cashTotal = useMemo(
    () => calculateCashTotal(sellPrice, totalAdditionalFees, discount || 0, deposit),
    [sellPrice, totalAdditionalFees, discount, deposit]
  );

  const totalPayment = useMemo(() => {
    // ✅ ถ้าเปิดผ่อนดาวน์ - วันนี้จ่ายแค่งวดแรกที่กรอกเอง (ไม่ใช่เงินดาวน์เต็มจำนวน)
    // ส่วนที่เหลือ (งวด 2 เป็นต้นไป) ไปอยู่ในบัญชี NPG แยกต่างหาก
    const effectiveDownPayment = downPaymentInstallment
      ? downPaymentFirstPaymentAmount || 0
      : down_payment || 0;

    return calculateTotalPayment(effectiveDownPayment, totalAdditionalFees, discount || 0, deposit);
  }, [
    down_payment,
    totalAdditionalFees,
    discount,
    deposit,
    downPaymentInstallment,
    downPaymentFirstPaymentAmount,
  ]);

  // ✅ logic checkout แยกไฟล์ตามประเภทธุรกรรม (sale/, service/)
  const { handleOrderCheckout } = useSaleOrderCheckout({
    orderCustomer,
    orderBike,
    orderAdditionalFees,
    orderGifts,
    notes,
    resetOrder,
    sellPrice,
    deposit,
    discount,
    down_payment,
    depositReceiptNo,
    paymentMethod: payment_method,
    financeProvider,
    npgPeriod,
    financeAmount,
    interest,
    installmentCount,
    installmentPerPeriod,
    paymentType,
    transferBank,
    checkNumber,
    totalPayment,
    cashTotal,
    downPaymentInstallment,
    downPaymentFirstPaymentAmount,
    downPaymentInstallmentCount,
    downPaymentInterestRate,
    downPaymentRemainingBalance,
    downPaymentPerRemainingInstallment,
    downPaymentNextPaymentDate,
  });

  const { handleServiceCheckout } = useServiceOrderCheckout({
    orderCustomer,
    orderBike,
    orderAdditionalFees,
    orderGifts,
    notes,
    resetOrder,
    transactionType,
    otherTransactionDetail,
    serviceItems,
    serviceDetail,
    paymentType,
    transferBank,
    checkNumber,
  });

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 shadow-lg overflow-y-auto">
      <div className="flex-1 overflow-y-auto p-4">
        <h1 className="text-2xl font-extrabold mb-5 text-center">รายการสั่งซื้อ</h1>

        <TransactionTypeTabs
          value={transactionType}
          onChange={setTransactionType}
          otherDetail={otherTransactionDetail}
          onOtherDetailChange={setOtherTransactionDetail}
        />

        <OrderCustomer />

        {/* รายการรถ */}
        {orderBike && bikeDisplay ? (
          <OrderBike bike={bikeDisplay} onRemove={removeBikeFromOrder} />
        ) : (
          <Link href="/inventory">
            <div className="flex items-center justify-between mt-3 gap-2 text-slate-900 cursor-pointer border-2 border-dashed border-slate-500 rounded-lg p-4 hover:bg-slate-200 transition-colors">
              <ShoppingCart opacity="60%" size={18} />
              <span className="text-base font-semibold">เพิ่มรถ</span>
            </div>
          </Link>
        )}

        {/* ของแถม */}
        {orderGifts.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <h1 className="font-semibold text-lg">ของแถม</h1>
              {orderGifts.map((gift) => (
                <OrderGift key={gift.id} gift={gift} />
              ))}
            </div>
          </>
        )}

        <Separator className="my-3" />

        {/* ค่าใช้จ่ายเพิ่มเติม */}
        <div className="mb-3">
          <h1 className="font-semibold text-lg mb-2">ค่าใช้จ่ายเพิ่มเติม</h1>
          <div className="space-y-2">
            {orderAdditionalFees.map((fee) => (
              <OrderFee key={fee.id} fee={fee} />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <OrderGiftDialog>
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-950 p-4 rounded-lg text-slate-50 text-base transition-colors">
              <Plus size={18} />
              <span className="font-medium">เพิ่มของแถม</span>
            </button>
          </OrderGiftDialog>

          <AdditionalFeeDialog>
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-950 p-4 rounded-lg text-slate-50 text-base transition-colors">
              <Plus size={18} />
              <span className="font-medium">เพิ่มค่าใช้จ่าย</span>
            </button>
          </AdditionalFeeDialog>
        </div>

        {/* ส่วนของการคำนวณราคา - เฉพาะ "ขาย" (ไม่เปลี่ยนแปลงจากเดิม) */}
        {transactionType === "ขาย" && orderBike && bikeDisplay && (
          <SaleOrderForm
            sellPrice={sellPrice}
            setSellPrice={setSellPrice}
            paymentMethod={payment_method}
            setPaymentMethod={setPayment_method}
            deposit={deposit}
            setDeposit={setDeposit}
            depositReceiptNo={depositReceiptNo}
            setDepositReceiptNo={setDepositReceiptNo}
            discount={discount || 0}
            setDiscount={setDiscount}
            financeProvider={financeProvider}
            setFinanceProvider={setFinanceProvider}
            npgPeriod={npgPeriod}
            setNpgPeriod={setNpgPeriod}
            bikeSize={bikeSize}
            setBikeSize={setBikeSize}
            downPayment={down_payment || 0}
            setDownPayment={setDown_payment}
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

        {/* ส่วนของการคำนวณราคา - ซ่อม / ต่อภาษี+พรบ / อื่นๆ (ไม่บังคับต้องเลือกรถ) */}
        {transactionType !== "ขาย" && (
          <ServiceOrderForm
            transactionType={transactionType}
            items={serviceItems}
            setItems={setServiceItems}
            detail={serviceDetail}
            setDetail={setServiceDetail}
          />
        )}
      </div>

      {/* Footer สรุปยอด - "ขาย" (ไม่เปลี่ยนแปลงจากเดิม ต้องเลือกรถก่อน) */}
      {transactionType === "ขาย" && orderBike && (
        <>
          <PaymentTypeSection
            paymentType={paymentType}
            setPaymentType={setPaymentType}
            transferBank={transferBank}
            setTransferBank={setTransferBank}
            checkNumber={checkNumber}
            setCheckNumber={setCheckNumber}
          />

          <OrderSummaryFooter
            payment_method={payment_method}
            installmentPerPeriod={installmentPerPeriod}
            installmentLabel={installmentLabel}
            totalPayment={totalPayment}
            cashTotal={cashTotal}
            handleOrderCheckout={handleOrderCheckout}
          />
        </>
      )}

      {/* Footer สรุปยอด - ซ่อม / ต่อภาษี+พรบ / อื่นๆ (ไม่บังคับต้องเลือกรถ) */}
      {transactionType !== "ขาย" && (
        <ServiceOrderFooter
          items={serviceItems}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          transferBank={transferBank}
          setTransferBank={setTransferBank}
          checkNumber={checkNumber}
          setCheckNumber={setCheckNumber}
          onSubmit={handleServiceCheckout}
        />
      )}
    </div>
  );
};

export default OrderCard;