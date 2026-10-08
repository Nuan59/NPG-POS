"use client";

import { OrderContext } from "@/context/OrderContext";
import { getCustomerOrders } from "@/services/OrderService";
import { ICustomer } from "@/types/Customer";
import { IOrder } from "@/types/Order";
import { ChevronDown, ChevronUp, Search, User, X } from "lucide-react";
import React, { useContext, useEffect, useState } from "react";

const OrderCustomer = () => {
  const { orderCustomer, addCustomerToOrder, removeCustomerFromOrder } =
    useContext(OrderContext);

  const [customerOrders, setCustomerOrders] = useState<IOrder[]>([]);
  const [customerName, setCustomerName] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [customersList, setCustomersList] = useState<ICustomer[]>([]);

  // ✅ แก้ จาก getCustomers() เป็น fetch("/api/customers")
  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomersList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ fetchCustomers error:", error);
      setCustomersList([]);
    }
  };

  const fetchCustomerOrders = async (id: number) => {
    try {
      const orders = await getCustomerOrders(id);
      setCustomerOrders(Array.isArray(orders) ? orders : []);
    } catch (error) {
      console.error("❌ fetchCustomerOrders error:", error);
      setCustomerOrders([]);
    }
  };

  const handleSelectCustomer = (customer: ICustomer) => {
    addCustomerToOrder(customer);
    setIsOpen(false);
    setCustomerName("");
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // ✅ ล้างจำนวนออเดอร์ของลูกค้าคนก่อนทันที (เดิมค้างโชว์ของคนเก่าจนกว่าจะโหลดเสร็จ)
    setCustomerOrders([]);
    if (orderCustomer?.id) {
      fetchCustomerOrders(orderCustomer.id);
    }
  }, [orderCustomer]);

  const filteredCustomers = customersList.filter((customer) =>
    (customer.name || "").toLowerCase().includes(customerName)
  );

  return (
    <div className="relative">
      {orderCustomer ? (
        /* ---------- ลูกค้าที่เลือกแล้ว ---------- */
        <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl p-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[#1e2432] text-white grid place-items-center font-medium">
            {(orderCustomer.name || "?").charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">{orderCustomer.name}</p>
            <span className="inline-block mt-0.5 text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
              {customerOrders.length === 0
                ? "ลูกค้าใหม่ (คำสั่งซื้อแรก)"
                : `ลูกค้าประจำ · ${customerOrders.length} คำสั่งซื้อ`}
            </span>
          </div>
          <button
            onClick={removeCustomerFromOrder}
            className="ml-auto shrink-0 h-8 w-8 rounded-lg border border-slate-200 text-slate-500 grid place-items-center hover:bg-slate-50"
            title="ลบลูกค้า"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          {/* ---------- ปุ่มเลือกลูกค้า ---------- */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="w-full flex items-center gap-2.5 bg-white border-[1.5px] border-dashed border-slate-300 rounded-2xl p-3 text-[#1e2432] hover:border-orange-500 transition-colors"
          >
            <User size={20} className="text-slate-400" />
            <span className="font-medium">เลือกลูกค้า</span>
            <span className="ml-auto text-slate-400">
              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>

          {/* ---------- Dropdown ---------- */}
          {isOpen && (
            <div className="absolute z-50 shadow-lg w-full left-0 top-full mt-1.5 rounded-xl bg-white text-slate-900 max-h-72 overflow-hidden border border-slate-200">
              <div className="sticky top-0 bg-white border-b border-slate-100">
                <div className="flex items-center px-3 py-2">
                  <Search className="text-slate-400 mr-2" size={16} />
                  <input
                    type="text"
                    placeholder="ค้นหาลูกค้า..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value.toLowerCase())}
                    className="flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 placeholder-slate-400"
                    autoFocus
                  />
                </div>
              </div>

              <ul className="overflow-y-auto max-h-60">
                {filteredCustomers.map((customer) => (
                  <li
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="px-4 py-2.5 text-sm hover:bg-orange-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-slate-500">{customer.phone}</div>
                  </li>
                ))}

                {filteredCustomers.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-slate-500">
                    {customerName ? `ไม่พบลูกค้า "${customerName}"` : "ยังไม่มีลูกค้าในระบบ"}
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderCustomer;