"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { IBike } from "@/types/Bike";
import { getBike } from "@/services/InventoryService";
import { OrderContext } from "@/context/OrderContext";
import { toast } from "sonner";

// ✅ shared/ - ใช้ร่วมกันทุกประเภทธุรกรรม
import OrderCustomer from "./shared/OrderCustomer";
import OrderBike from "./shared/OrderBike";
import OrderOwnedBikeSelect from "./shared/OrderOwnedBikeSelect";
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
  parseSellPrice,
  calculateDownPaymentInstallment,
} from "./shared/Financecalculations";
import {
  PaymentType,
  TransferBank,
  PaymentTypeSection,
  OrderSummaryFooter,
  StepLabel,
} from "./shared/PaymentSection";

// ✅ sale/ - เฉพาะประเภท "ขาย"
import SaleOrderForm from "./sale/SaleOrderForm";
import { useSaleOrderCheckout } from "./sale/useSaleOrderCheckout";

// ✅ service/ - เฉพาะประเภท "ซ่อม" / "ต่อภาษี+พรบ" / "อื่นๆ"
import ServiceOrderForm from "./service/ServiceOrderForm";
import ServiceOrderFooter from "./service/ServiceOrderFooter";
import { useServiceOrderCheckout } from "./service/useServiceOrderCheckout";
import { calculateServiceItemsTotal, type ServiceItem } from "./service/ServiceItems";

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
  // ✅ เลขไมล์ ณ ตอนรับบริการ - เก็บไว้ทำประวัติรถ + ช่วยสังเกตความผิดปกติ (กันทุจริต)
  const [mileage, setMileage] = useState<string>("");

  // ขาย = ราคาตั้ง
  const [sellPrice, setSellPrice] = useState<string>("");

  // มัดจำ (Deposit)
  const [deposit, setDeposit] = useState<number>(0);
  const [depositReceiptNo, setDepositReceiptNo] = useState<string>("");

  // วิธีการชำระเงิน (ใช้ร่วมกันทั้งขาย/ซ่อม/ต่อภาษี+พรบ/อื่นๆ)
  const [paymentType, setPaymentType] = useState<PaymentType>("");
  const [transferBank, setTransferBank] = useState<TransferBank>("");
  const [checkNumber, setCheckNumber] = useState<string>("");
  // ✅ แบ่งจ่าย - ยอดส่วนที่เป็นเงินสด (ที่เหลือคือโอน)
  const [splitCash, setSplitCash] = useState<string>("");

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

  // ✅ ผ่อนดาวน์ - ใช้สูตรกลางจาก Financecalculations (ตัวเดียวกับที่ FinanceSection โชว์ ไม่มีทางไม่ตรงกัน)
  const {
    remainingBalance: downPaymentRemainingBalance,
    perRemainingInstallment: downPaymentPerRemainingInstallment,
  } = useMemo(
    () =>
      calculateDownPaymentInstallment(
        down_payment || 0,
        downPaymentFirstPaymentAmount || 0,
        downPaymentInstallmentCount,
        downPaymentInterestRate
      ),
    [down_payment, downPaymentFirstPaymentAmount, downPaymentInstallmentCount, downPaymentInterestRate]
  );

  useEffect(() => {
    if (bikeDisplay) {
      setBikeSize(isBigBike(bikeDisplay.model_name, bikeDisplay.model_code) ? "L" : "S");
    } else {
      setBikeSize("");
      setMileage("");
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

  // ✅ โหลดข้อมูลรถล่าสุด - ถอดรถออกแล้วต้องล้าง bikeDisplay ด้วย (เดิมค้างไว้ ทำให้เลขไมล์/ขนาดรถไม่ถูกล้าง)
  // กันผลลัพธ์เก่ามาทับ (เลือกรถคันใหม่ระหว่างที่คันเก่ายังโหลดไม่เสร็จ) ด้วย flag cancelled
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!orderBike) {
        setBikeDisplay(null);
        return;
      }
      try {
        const bike = await getBike(orderBike.id);
        if (!cancelled) setBikeDisplay(bike || orderBike);
      } catch (error) {
        console.error("❌ getBike error:", error);
        // โหลดไม่ได้ก็ยังโชว์ข้อมูลรถจาก context ไว้ก่อน ไม่ให้การ์ดหาย
        if (!cancelled) setBikeDisplay(orderBike);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [orderBike, totalPrice]);

  // ✅ เลือกรถคันใหม่ในแท็บ "ขาย" → เติมราคาขายจากราคาตั้งของรถให้อัตโนมัติ (แก้เองได้)
  // เติมครั้งเดียวต่อรถ 1 คัน - ไม่ทับราคาที่พนักงานแก้ไปแล้ว
  const prefilledBikeIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!bikeDisplay) {
      prefilledBikeIdRef.current = null;
      return;
    }
    if (transactionType !== "ขาย") return;
    if (prefilledBikeIdRef.current === bikeDisplay.id) return;
    prefilledBikeIdRef.current = bikeDisplay.id;
    const price = parseSellPrice((bikeDisplay as any).sale_price ?? "");
    if (price > 0) setSellPrice(String(price));
  }, [bikeDisplay, transactionType]);

  // ✅ สลับแท็บข้ามกลุ่ม ขาย <-> ซ่อม/ภาษี/อื่นๆ → ล้างรถ
  // แท็บขายใช้รถในสต็อก (ยังไม่ขาย) / แท็บอื่นใช้รถของลูกค้า - ถ้าไม่ล้างจะขายรถลูกค้าซ้ำ หรือบันทึกซ่อมให้รถในสต็อก
  const handleTransactionTypeChange = (type: TransactionType) => {
    const crossingGroup = (transactionType === "ขาย") !== (type === "ขาย");
    if (crossingGroup && orderBike) {
      removeBikeFromOrder();
      toast.info("ล้างรถออกแล้ว เพราะเปลี่ยนประเภทงาน");
    }
    setTransactionType(type);
  };

  // ✅ เปลี่ยน/ลบลูกค้า ระหว่างอยู่แท็บ ซ่อม/ภาษี/อื่นๆ → ล้างรถ (รถเป็นของลูกค้าคนเดิม)
  const prevCustomerIdRef = useRef<number | null>(orderCustomer?.id ?? null);
  useEffect(() => {
    const currentId = orderCustomer?.id ?? null;
    if (prevCustomerIdRef.current === currentId) return;
    prevCustomerIdRef.current = currentId;
    if (transactionType !== "ขาย" && orderBike) {
      removeBikeFromOrder();
      toast.info("ล้างรถออกแล้ว เพราะเปลี่ยนลูกค้า");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCustomer?.id]);

  // ✅ ล้างทุกอย่างหลังบันทึกสำเร็จ - resetOrder() ล้างแค่ใน context
  // state ในการ์ดนี้ (ราคาขาย/มัดจำ/รายการซ่อม/รูปแบบชำระ ฯลฯ) เดิมค้างไปออเดอร์ถัดไป
  const resetAll = () => {
    resetOrder();
    setTransactionType("ขาย");
    setOtherTransactionDetail("");
    setServiceItems([]);
    setServiceDetail("");
    setMileage("");
    setSellPrice("");
    setDeposit(0);
    setDepositReceiptNo("");
    setPaymentType("");
    setTransferBank("");
    setCheckNumber("");
    setSplitCash("");
    setFinanceProvider("");
    setNpgPeriod("");
    setInterest("");
    setInstallmentCount("");
    setDownPaymentInstallment(false);
    setDownPaymentFirstPaymentAmount(0);
    setDownPaymentInstallmentCount("");
    setDownPaymentInterestRate("");
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDownPaymentNextPaymentDate(d.toISOString().slice(0, 10));
    prefilledBikeIdRef.current = null;
  };

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

  // ยอดรวมงานบริการ (ใช้คำนวณส่วนโอนของแบ่งจ่าย)
  const serviceTotal = useMemo(() => calculateServiceItemsTotal(serviceItems), [serviceItems]);

  // ✅ logic checkout แยกไฟล์ตามประเภทธุรกรรม (sale/, service/)
  const {
    handleOrderCheckout,
    isSubmitting: isSaleSubmitting,
    validationMessage: saleValidationMessage,
  } = useSaleOrderCheckout({
    orderCustomer,
    orderBike,
    orderAdditionalFees,
    orderGifts,
    notes,
    resetOrder: resetAll,
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
    splitCash,
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

  const {
    handleServiceCheckout,
    isSubmitting: isServiceSubmitting,
    validationMessage: serviceValidationMessage,
  } = useServiceOrderCheckout({
    orderCustomer,
    orderBike,
    orderAdditionalFees,
    orderGifts,
    notes,
    resetOrder: resetAll,
    transactionType,
    otherTransactionDetail,
    serviceItems,
    serviceDetail,
    paymentType,
    transferBank,
    checkNumber,
    splitCash,
    mileage,
  });

  const isSale = transactionType === "ขาย";

  // ✅ font-medium + text-slate-900 ทั้งการ์ด - ฟอนต์หลักของเว็บบาง อ่านยาก
  return (
    <div className="w-full h-full flex flex-col bg-slate-50 shadow-lg overflow-hidden font-medium text-slate-900">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-[18px] bg-orange-500 rounded-sm -skew-x-12" />
          <h1 className="text-lg font-bold">รายการสั่งซื้อ</h1>
        </div>

        <TransactionTypeTabs
          value={transactionType}
          onChange={handleTransactionTypeChange}
          otherDetail={otherTransactionDetail}
          onOtherDetailChange={setOtherTransactionDetail}
        />

        {/* 1. ลูกค้า */}
        <StepLabel step={1} label="ลูกค้า" />
        <OrderCustomer />

        {/* 2. รถ - แท็บ "ขาย" เลือกจากคลังสินค้า (รถยังไม่ขาย) / แท็บอื่นเลือกจากรถของลูกค้าคนนี้ */}
        <StepLabel step={2} label="รถ" hint={isSale ? undefined : "(รถของลูกค้า)"} />
        {orderBike && bikeDisplay ? (
          <OrderBike bike={bikeDisplay} onRemove={removeBikeFromOrder} />
        ) : isSale ? (
          <Link href="/inventory">
            <div className="flex items-center gap-2.5 bg-white border-[1.5px] border-dashed border-slate-300 rounded-2xl p-3 text-[#1e2432] hover:border-orange-500 transition-colors cursor-pointer">
              <ShoppingCart size={20} className="text-slate-500" />
              <span className="font-semibold">เพิ่มรถ</span>
              <span className="ml-auto text-xs text-slate-500">เลือกจากคลังสินค้า</span>
            </div>
          </Link>
        ) : (
          <OrderOwnedBikeSelect />
        )}

        {/* 3. ของแถม + ค่าใช้จ่ายเพิ่มเติม - เฉพาะ "ขาย" เท่านั้น */}
        {isSale && (
          <>
            <StepLabel step={3} label="ของแถม / ค่าใช้จ่ายเพิ่มเติม" />
            {(orderGifts.length > 0 || orderAdditionalFees.length > 0) && (
              <div className="space-y-1.5 mb-2">
                {orderGifts.map((gift) => (
                  <OrderGift key={gift.id} gift={gift} />
                ))}
                {orderAdditionalFees.map((fee) => (
                  <OrderFee key={fee.id} fee={fee} />
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <OrderGiftDialog>
                <button className="flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl border-[1.5px] border-dashed border-slate-300 bg-white text-[#1e2432] hover:border-orange-500 hover:text-orange-600 transition-colors">
                  <Plus size={16} />
                  ของแถม
                </button>
              </OrderGiftDialog>

              <AdditionalFeeDialog>
                <button className="flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl border-[1.5px] border-dashed border-slate-300 bg-white text-[#1e2432] hover:border-orange-500 hover:text-orange-600 transition-colors">
                  <Plus size={16} />
                  ค่าใช้จ่าย
                </button>
              </AdditionalFeeDialog>
            </div>
          </>
        )}

        {/* 4. ราคา - เฉพาะ "ขาย" (ต้องเลือกรถก่อน) */}
        {isSale && orderBike && bikeDisplay && (
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

        {/* 3. รายการ - ซ่อม / ต่อภาษี+พรบ / อื่นๆ (บังคับเลือกรถตอนบันทึก) */}
        {!isSale && (
          <ServiceOrderForm
            transactionType={transactionType}
            items={serviceItems}
            setItems={setServiceItems}
            detail={serviceDetail}
            setDetail={setServiceDetail}
            showMileage={!!orderBike}
            mileage={mileage}
            setMileage={setMileage}
          />
        )}

        {/* รูปแบบการชำระ - ขาย (ต้องมีรถก่อน) / บริการ (โชว์เสมอ) */}
        {(!isSale || orderBike) && (
          <PaymentTypeSection
            step={isSale ? 5 : 4}
            paymentType={paymentType}
            setPaymentType={setPaymentType}
            transferBank={transferBank}
            setTransferBank={setTransferBank}
            checkNumber={checkNumber}
            setCheckNumber={setCheckNumber}
            splitCash={splitCash}
            setSplitCash={setSplitCash}
            total={isSale ? (payment_method === "ไฟแนนซ์" ? totalPayment : cashTotal) : serviceTotal}
          />
        )}
      </div>

      {/* ท้ายการ์ด - "ขาย" (ต้องเลือกรถก่อน) */}
      {isSale && orderBike && (
        <OrderSummaryFooter
          payment_method={payment_method}
          installmentPerPeriod={installmentPerPeriod}
          installmentLabel={installmentLabel}
          totalPayment={totalPayment}
          cashTotal={cashTotal}
          handleOrderCheckout={handleOrderCheckout}
          downPaymentInstallment={payment_method === "ไฟแนนซ์" && downPaymentInstallment}
          isSubmitting={isSaleSubmitting}
          sellPrice={parseSellPrice(sellPrice)}
          totalAdditionalFees={totalAdditionalFees}
          discount={discount || 0}
          deposit={deposit || 0}
          downPaymentToday={downPaymentInstallment ? downPaymentFirstPaymentAmount || 0 : down_payment || 0}
          hint={saleValidationMessage}
        />
      )}

      {/* ท้ายการ์ด - ซ่อม / ต่อภาษี+พรบ / อื่นๆ */}
      {!isSale && (
        <ServiceOrderFooter
          items={serviceItems}
          onSubmit={handleServiceCheckout}
          isSubmitting={isServiceSubmitting}
          hint={serviceValidationMessage}
        />
      )}
    </div>
  );
};

export default OrderCard;