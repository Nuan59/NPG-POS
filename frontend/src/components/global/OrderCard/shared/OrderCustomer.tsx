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
    const orders = await getCustomerOrders(id);
    setCustomerOrders(Array.isArray(orders) ? orders : []);
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
    if (orderCustomer?.id) {
      fetchCustomerOrders(orderCustomer.id);
    }
  }, [orderCustomer]);

  return (
    <div className="bg-slate-600 text-white my-2 p-4 flex flex-col items-start rounded-lg shadow-sm relative">
      {orderCustomer ? (
        <>
          {/* ---------- Selected customer ---------- */}
          <div className="flex items-center gap-3 w-full">
            <User opacity={"60%"} size={26} />
            <div className="flex flex-col items-start flex-1">
              <h3 className="font-extrabold text-xl leading-tight">
                {orderCustomer.name}
              </h3>
              <span className="text-base opacity-80 leading-tight">
                {customerOrders.length === 0
                  ? "ลูกค้าใหม่ (คำสั่งซื้อแรก)"
                  : `ลูกค้าประจำ (${customerOrders.length} คำสั่งซื้อ)`}
              </span>
            </div>
            
            <button
              onClick={removeCustomerFromOrder}
              className="bg-white hover:bg-gray-100 text-slate-900 p-2 rounded transition-colors"
              title="ลบลูกค้า"
            >
              <X size={18} />
            </button>
          </div>
        </>
      ) : (
        <div className="w-full relative">
          {/* ---------- Select button ---------- */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="hover:bg-slate-700 transition-colors p-2 -m-2 rounded flex w-full justify-between items-center"
          >
            <div className="flex items-center gap-2">
              <User opacity={"60%"} size={26} />
              <h3 className="font-extrabold text-xl">เลือกลูกค้า</h3>
            </div>
            {isOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </button>

          {/* ---------- Dropdown ---------- */}
          {isOpen && (
            <div className="absolute z-50 shadow-lg w-full left-0 top-full mt-2 rounded-lg bg-white text-slate-900 max-h-72 overflow-hidden border border-gray-200">
              {/* Search */}
              <div className="sticky top-0 bg-white border-b border-gray-200">
                <div className="flex items-center px-3 py-2">
                  <Search className="text-gray-400 mr-2" size={18} />
                  <input
                    type="text"
                    placeholder="ค้นหาลูกค้า..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value.toLowerCase())}
                    className="flex-1 text-base bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Customer list */}
              <ul className="overflow-y-auto max-h-60">
                {customersList
                  .filter(customer => 
                    customer.name.toLowerCase().includes(customerName)
                  )
                  .map((customer) => (
                    <li
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="px-4 py-3 text-base hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                
                {customersList.filter(customer => 
                  customer.name.toLowerCase().includes(customerName)
                ).length === 0 && (
                  <li className="px-4 py-8 text-center text-gray-500">
                    {customerName ? `ไม่พบลูกค้า "${customerName}"` : "ยังไม่มีลูกค้าในระบบ"}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderCustomer;