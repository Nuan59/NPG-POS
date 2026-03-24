"use client";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Separator } from "../../ui/separator";
import OrderCustomer from "./components/OrderCustomer";
import { OrderContext } from "@/context/OrderContext";
import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { IBike } from "@/types/Bike";
import { getBike } from "@/services/InventoryService";
import OrderBike from "./components/OrderBike";
import AdditionalFeeDialog from "./components/AdditionalFeeDialog";
import OrderFee from "./components/OrderFee";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import OrderGiftDialog from "./components/OrderGiftDialog";
import OrderGift from "./components/OrderGift";
import { toast } from "sonner";
import { IOrder } from "@/types/Order";
import { createOrder } from "@/services/OrderService";
import { useRouter } from "next/navigation";

// Import จาก 2 ไฟล์ที่แยกออกมา
import {
  FinanceProvider,
  NpgPeriod,
  useFinanceCalculations,
  numberToInput,
  toNumber,
  parseSellPrice,
  calculateTotalAdditionalFees,
  calculateCashTotal,
  calculateTotalPayment,
} from "./components/financeCalculations";

import {
  PaymentType,
  TransferBank,
  FinanceSection,
  PaymentTypeSection,
  OrderSummaryFooter,
} from "./components/PaymentSection";

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

  const router = useRouter();
  const [bikeDisplay, setBikeDisplay] = useState<IBike | null>(orderBike);

  // ขาย = ราคาตั้ง
  const [sellPrice, setSellPrice] = useState<string>("");

  // มัดจำ (Deposit)
  const [deposit, setDeposit] = useState<number>(0);

  // วิธีการชำระเงิน
  const [paymentType, setPaymentType] = useState<PaymentType>("");
  const [transferBank, setTransferBank] = useState<TransferBank>("");
  const [checkNumber, setCheckNumber] = useState<string>("");

  // Finance controls
  const [financeProvider, setFinanceProvider] = useState<FinanceProvider>("");
  const [npgPeriod, setNpgPeriod] = useState<NpgPeriod>("");

  // ใช้ custom hook สำหรับคำนวณไฟแนนซ์
  const {
    financeAmount,
    setFinanceAmount,
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
    roundingMethod: "standard", // ใช้ปัดเศษมาตรฐานเสมอ
  });

  const fetchData = async () => {
    if (orderBike) {
      const bike = await getBike(orderBike.id);
      setBikeDisplay(bike);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orderBike, totalPrice]);

  // คำนวณค่าต่างๆ
  const totalAdditionalFees = useMemo(
    () => calculateTotalAdditionalFees(orderAdditionalFees),
    [orderAdditionalFees]
  );

  const cashTotal = useMemo(
    () => calculateCashTotal(sellPrice, totalAdditionalFees, discount || 0, deposit),
    [sellPrice, totalAdditionalFees, discount, deposit]
  );

  const totalPayment = useMemo(
    () => calculateTotalPayment(down_payment || 0, totalAdditionalFees, discount || 0, deposit),
    [down_payment, totalAdditionalFees, discount, deposit]
  );

  // ✅ ฟังก์ชัน checkout ที่แก้ไขแล้ว
  const handleOrderCheckout = async () => {
    if (!orderCustomer) {
      toast.info("Select customer before checkout");
      return;
    }

    const sell = parseSellPrice(sellPrice);
    if (sell <= 0) {
      toast.info("กรุณากรอกราคาขายก่อนชำระเงิน");
      return;
    }

    const payload = {
      customer: orderCustomer.id,
      bikes: [orderBike],
      additional_fees: orderAdditionalFees.map((fee) => fee),
      gifts: orderGifts.map((gift) => gift),

      // ข้อมูลการขาย
      sale_price: sell,
      deposit: deposit || 0,
      discount,
      down_payment,

      // ข้อมูลไฟแนนซ์
      finance_amount: payment_method === "ไฟแนนซ์" ? toNumber(financeAmount) : 0,
      interest_rate: payment_method === "ไฟแนนซ์" ? toNumber(interest) : 0,
      installment_count: payment_method === "ไฟแนนซ์" ? toNumber(installmentCount) : 0,
      installment_amount: payment_method === "ไฟแนนซ์" ? toNumber(installmentPerPeriod) : 0,
      finance_provider:
        payment_method === "ไฟแนนซ์" && financeProvider ? financeProvider : "",

      // ประเภทการซื้อ
      payment_method:
        payment_method === "ไฟแนนซ์" && financeProvider
          ? financeProvider
          : payment_method,

      // รูปแบบการชำระ
      payment_type: paymentType,
      transfer_bank: paymentType === "เงินโอน" ? transferBank : "",
      check_number: paymentType === "เช็ค" ? checkNumber : "",

      notes,
      total: payment_method === "ไฟแนนซ์" ? totalPayment : cashTotal,
    } as IOrder;

    const checkout = await createOrder(payload);
    if (checkout.status === "success") {
      const data = await checkout.data;
      const orderId = data.data;
      
      toast.success("ชำระเงินสำเร็จ!");
      
      // Reset order และไปหน้าเลือกเอกสาร
      resetOrder();
      router.push(`/sales/${orderId}/documents`);
    } else {
      const error = await checkout.data;
      Object.keys(error).map((key) => {
        toast.error(`${key}: ${error[key][0]}`);
      });
    }
  };

  const labelCls = "text-sm font-medium min-w-[100px]";
  const inputCls = "w-40 text-right p-2 text-sm";

  return (
    <div className="w-[420px] h-full flex flex-col bg-slate-50 shadow-lg overflow-y-auto">
      <div className="flex-1 overflow-y-auto p-4">
        <h1 className="text-2xl font-extrabold mb-5 text-center">รายการสั่งซื้อ</h1>

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

        {/* ส่วนของการคำนวณราคา */}
        {orderBike && bikeDisplay && (
          <>
            <Separator className="my-4" />

            {/* ราคาขาย */}
            <div className="space-y-3">
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
                <Select value={payment_method} onValueChange={setPayment_method}>
                  <SelectTrigger className="w-40 text-sm p-2">
                    {payment_method || "เลือก"}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="เงินสด">เงินสด</SelectItem>
                    <SelectItem value="ไฟแนนซ์">ไฟแนนซ์</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ถ้าเลือกเงินสด */}
              {payment_method === "เงินสด" && (
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
              {payment_method === "ไฟแนนซ์" && (
                <FinanceSection
                  financeProvider={financeProvider}
                  setFinanceProvider={setFinanceProvider}
                  npgPeriod={npgPeriod}
                  setNpgPeriod={setNpgPeriod}
                  deposit={deposit}
                  setDeposit={setDeposit}
                  discount={discount || 0}
                  setDiscount={setDiscount}
                  down_payment={down_payment || 0}
                  setDown_payment={setDown_payment}
                  financeAmount={financeAmount}
                  interest={interest}
                  setInterest={setInterest}
                  installmentCount={installmentCount}
                  setInstallmentCount={setInstallmentCount}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer สรุปยอด */}
      {orderBike && (
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
    </div>
  );
};

export default OrderCard;