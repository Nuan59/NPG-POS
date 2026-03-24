"use client";
import React, {
  Dispatch,
  SetStateAction,
  createContext,
  useEffect,
  useState,
} from "react";
import { ICustomer } from "@/types/Customer";
import { IBike } from "@/types/Bike";
import { IAdditionalFee } from "@/types/AdditionalFee";
import { OrderGift } from "@/types/Gift";

type OrderContextType = {
  orderBike: IBike | null;
  bikePrice: number;
  orderCustomer: ICustomer | null;
  orderAdditionalFees: IAdditionalFee[];
  orderGifts: OrderGift[];
  discount: number;
  down_payment: number;
  payment_method: string;
  notes: string;
  totalPrice: number;
  addBikeToOrder: (bike: IBike) => void;
  removeBikeFromOrder: () => void;
  addCustomerToOrder: (customer: ICustomer) => void;
  removeCustomerFromOrder: () => void;
  addAdditionalFee: (fee: { description: string; amount: number }) => void;
  editAdditionalFee: (fee: IAdditionalFee) => void;
  removeAdditionalFee: (fee_id: number) => void;
  addOrderGift: (gift: OrderGift) => void;
  editOrderGift: (gift: OrderGift) => void;
  removeOrderGift: (gift_id: number) => void;
  resetOrder: () => void;
  setDiscount: Dispatch<SetStateAction<number>>;
  setDown_payment: Dispatch<SetStateAction<number>>;
  setPayment_method: Dispatch<SetStateAction<string>>;
  setNotes: Dispatch<SetStateAction<string>>;
};

export const OrderContext = createContext({} as OrderContextType);

const OrderProvider = ({ children }: { children: React.ReactNode }) => {
  const [orderBike, setOrderBike] = useState<IBike | null>(null);
  const [orderCustomer, setOrderCustomer] = useState<ICustomer | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [down_payment, setDown_payment] = useState<number>(0);
  const [payment_method, setPayment_method] = useState<string>("");
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [bikePrice, setBikePrice] = useState<number>(0);
  const [orderAdditionalFees, setOrderAdditionalFees] = useState<
    IAdditionalFee[]
  >([]);
  const [orderGifts, setOrderGifts] = useState<OrderGift[]>([]);

  const addBikeToOrder = (bike: IBike) => {
    setBikePrice(parseFloat(bike.sale_price) || 0);
    setOrderBike(bike);
  };

  const removeBikeFromOrder = () => {
    setOrderBike(null);
  };

  const addCustomerToOrder = (customer: ICustomer) => {
    setOrderCustomer(customer);
  };

  const removeCustomerFromOrder = () => {
    setOrderCustomer(null);
  };

  const addAdditionalFee = (fee: { description: string; amount: number }) => {
    const nextIndex = Math.floor(Math.random() * 100);
    const newFees = [...orderAdditionalFees, { ...fee, id: nextIndex }];
    setOrderAdditionalFees(newFees);
  };

  const editAdditionalFee = (feeInput: IAdditionalFee) => {
    setOrderAdditionalFees([
      ...orderAdditionalFees.filter((fee) => fee.id !== feeInput.id),
      feeInput,
    ]);
  };

  const removeAdditionalFee = (fee_id: number) => {
    const newFeesList = orderAdditionalFees.filter((fee) => fee.id !== fee_id);
    setOrderAdditionalFees(newFeesList);
  };

  const addOrderGift = (gift: OrderGift) => {
    const newGifts = [...orderGifts, gift];
    setOrderGifts(newGifts);
  };

  const editOrderGift = (giftInput: OrderGift) => {
    setOrderGifts([
      ...orderGifts.filter((gift) => gift.id !== giftInput.id),
      giftInput,
    ]);
  };

  const removeOrderGift = (gift_id: number) => {
    const newGiftsList = orderGifts.filter((gift) => gift.id !== gift_id);
    setOrderGifts(newGiftsList);
  };

  const resetOrder = () => {
    setOrderAdditionalFees([]);
    setOrderGifts([]);
    removeBikeFromOrder();
    removeCustomerFromOrder();
    setDiscount(0);
    setDown_payment(0);
    setNotes("");
    setPayment_method("");
  };

  useEffect(() => {
    let total = 0;

    if (orderBike) {
      total += parseFloat(orderBike?.sale_price) || 0;
      if (orderAdditionalFees) {
        orderAdditionalFees.map((fee) => {
          total += fee.amount;
        });
      }
    }

    total = total - discount;

    setTotalPrice(total);
  }, [orderBike, bikePrice, orderAdditionalFees, discount]);

  return (
    <OrderContext.Provider
      value={{
        orderBike,
        bikePrice,
        orderCustomer,
        orderAdditionalFees,
        orderGifts,
        discount,
        down_payment,
        payment_method,
        totalPrice,
        notes,
        setNotes,
        addBikeToOrder,
        removeBikeFromOrder,
        addCustomerToOrder,
        removeCustomerFromOrder,
        addAdditionalFee,
        editAdditionalFee,
        removeAdditionalFee,
        addOrderGift,
        editOrderGift,
        removeOrderGift,
        resetOrder,
        setDiscount,
        setDown_payment,
        setPayment_method,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export default OrderProvider;
