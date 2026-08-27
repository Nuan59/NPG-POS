"use client";

import { OrderContext } from "@/context/OrderContext";
import { getCustomerOrders } from "@/services/OrderService";
import { IBike } from "@/types/Bike";
import { IOrder } from "@/types/Order";
import { ChevronDown, ChevronUp, Search, Bike as BikeIcon } from "lucide-react";
import React, { useContext, useEffect, useState } from "react";

/**
 * เลือกรถที่ลูกค้าคนนี้เคยซื้อไปแล้ว (จากประวัติการขายของลูกค้า)
 * ใช้แทนปุ่ม "เพิ่มรถ" (ไปหน้าคลังสินค้า) สำหรับแท็บที่ไม่ใช่ "ขาย"
 * เช่น ซ่อม / ต่อภาษี+พรบ / อื่นๆ ที่งานเกี่ยวกับรถคันที่ลูกค้าซื้อไปแล้ว ไม่ใช่รถในสต็อกที่ยังไม่ได้ขาย
 */
const OrderOwnedBikeSelect = () => {
  const { orderCustomer, addBikeToOrder } = useContext(OrderContext);

  const [customerOrders, setCustomerOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    const fetchOrders = async () => {
      if (!orderCustomer?.id) {
        setCustomerOrders([]);
        return;
      }
      setLoading(true);
      try {
        const orders = await getCustomerOrders(orderCustomer.id);
        setCustomerOrders(Array.isArray(orders) ? orders : []);
      } catch (error) {
        console.error("❌ fetchOrders (owned bikes) error:", error);
        setCustomerOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [orderCustomer]);

  // ✅ รวมรถทุกคันจากทุกออเดอร์ที่ลูกค้าคนนี้เคยซื้อ แล้วตัดตัวซ้ำออก (เผื่อซื้อรุ่นเดียวกันหลายคัน ใช้ id คันจริงแยก)
  const ownedBikes: IBike[] = React.useMemo(() => {
    const map = new Map<number, IBike>();
    customerOrders.forEach((order) => {
      (order.bikes || []).forEach((bike: any) => {
        if (bike?.id) map.set(bike.id, bike);
      });
    });
    return Array.from(map.values());
  }, [customerOrders]);

  const filteredBikes = ownedBikes.filter((bike) =>
    `${bike.model_name} ${bike.model_code} ${bike.chassi}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleSelectBike = (bike: IBike) => {
    addBikeToOrder(bike);
    setIsOpen(false);
    setSearchTerm("");
  };

  if (!orderCustomer) {
    return (
      <div className="flex items-center justify-center gap-2 mt-3 text-slate-500 border-2 border-dashed border-slate-300 rounded-lg p-4">
        <BikeIcon opacity="60%" size={18} />
        <span className="text-sm">กรุณาเลือกลูกค้าก่อนจึงจะเลือกรถได้</span>
      </div>
    );
  }

  return (
    <div className="relative mt-3">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between gap-2 w-full text-slate-900 cursor-pointer border-2 border-dashed border-slate-500 rounded-lg p-4 hover:bg-slate-200 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BikeIcon opacity="60%" size={18} />
          <span className="text-base font-semibold">เลือกรถของลูกค้า</span>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div className="absolute z-50 shadow-lg w-full left-0 top-full mt-2 rounded-lg bg-white text-slate-900 max-h-72 overflow-hidden border border-gray-200">
          <div className="sticky top-0 bg-white border-b border-gray-200">
            <div className="flex items-center px-3 py-2">
              <Search className="text-gray-400 mr-2" size={18} />
              <input
                type="text"
                placeholder="ค้นหารุ่นรถ/เลขตัวถัง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 text-base bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400"
                autoFocus
              />
            </div>
          </div>

          <ul className="overflow-y-auto max-h-60">
            {loading && (
              <li className="px-4 py-8 text-center text-gray-500">กำลังโหลด...</li>
            )}

            {!loading && filteredBikes.length === 0 && (
              <li className="px-4 py-8 text-center text-gray-500">
                {ownedBikes.length === 0
                  ? "ลูกค้าคนนี้ยังไม่เคยซื้อรถกับร้าน"
                  : `ไม่พบรถที่ค้นหา "${searchTerm}"`}
              </li>
            )}

            {!loading &&
              filteredBikes.map((bike) => (
                <li
                  key={bike.id}
                  onClick={() => handleSelectBike(bike)}
                  className="px-4 py-3 text-base hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-medium">{bike.model_name}</div>
                  <div className="text-sm text-gray-500">
                    {bike.model_code} • {bike.chassi}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default OrderOwnedBikeSelect;