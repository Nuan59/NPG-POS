"use client";

import { OrderContext } from "@/context/OrderContext";
import { getCustomerOrders } from "@/services/OrderService";
import { IBike } from "@/types/Bike";
import { IOrder } from "@/types/Order";
import { ChevronDown, ChevronUp, Search, Bike as BikeIcon, Plus } from "lucide-react";
import React, { useContext, useEffect, useState } from "react";
import { getSession } from "next-auth/react";
import RegisterCustomerBikeDialog from "./RegisterCustomerBikeDialog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * เลือกรถที่ลูกค้าคนนี้เคยซื้อไปแล้ว (จากประวัติการขายของลูกค้า)
 * ใช้แทนปุ่ม "เพิ่มรถ" (ไปหน้าคลังสินค้า) สำหรับแท็บที่ไม่ใช่ "ขาย"
 * เช่น ซ่อม / ต่อภาษี+พรบ / อื่นๆ ที่งานเกี่ยวกับรถคันที่ลูกค้าซื้อไปแล้ว ไม่ใช่รถในสต็อกที่ยังไม่ได้ขาย
 */
const OrderOwnedBikeSelect = () => {
  const { orderCustomer, addBikeToOrder } = useContext(OrderContext);

  const [customerOrders, setCustomerOrders] = useState<IOrder[]>([]);
  // ✅ รถจากงานบริการเดิมของลูกค้า (ตาราง service_record แยกจากงานขายแล้ว)
  // เช่น รถลูกค้าที่ลงทะเบียนไว้ตอนมาซ่อมครั้งก่อน - ไม่มีใน Order เลยต้องดึงจาก /service/ ด้วย
  const [serviceBikes, setServiceBikes] = useState<IBike[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [registerDialogOpen, setRegisterDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!orderCustomer?.id) {
        setCustomerOrders([]);
        setServiceBikes([]);
        return;
      }
      setLoading(true);
      try {
        const session = await getSession();
        const token = (session as any)?.user?.accessToken;
        const [orders, serviceRes] = await Promise.all([
          getCustomerOrders(orderCustomer.id),
          fetch(`${API_BASE_URL}/service/?customer=${orderCustomer.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
        ]);
        setCustomerOrders(Array.isArray(orders) ? orders : []);
        const services = serviceRes && serviceRes.ok ? await serviceRes.json() : [];
        setServiceBikes(
          (Array.isArray(services) ? services : []).map((r: any) => r.bike).filter((b: any) => b?.id)
        );
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
    serviceBikes.forEach((bike) => {
      if (bike?.id && !map.has(bike.id)) map.set(bike.id, bike);
    });
    return Array.from(map.values());
  }, [customerOrders, serviceBikes]);

  const filteredBikes = ownedBikes.filter((bike) =>
    `${bike.model_name} ${bike.model_code} ${bike.chassi || ""} ${(bike as any).registration_plate || ""}`
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
      <div className="flex items-center gap-2.5 text-slate-500 bg-white border-[1.5px] border-dashed border-slate-200 rounded-2xl p-3">
        <BikeIcon size={20} />
        <span className="text-sm">กรุณาเลือกลูกค้าก่อนจึงจะเลือกรถได้</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 bg-white border-[1.5px] border-dashed border-slate-300 rounded-2xl p-3 text-[#1e2432] hover:border-orange-500 transition-colors"
      >
        <BikeIcon size={20} className="text-slate-500" />
        <span className="font-semibold">เลือกรถของลูกค้า</span>
        <span className="ml-auto text-slate-500">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 shadow-lg w-full left-0 top-full mt-1.5 rounded-xl bg-white text-slate-900 max-h-80 overflow-hidden border border-slate-200 flex flex-col">
          <div className="sticky top-0 bg-white border-b border-gray-200">
            <div className="flex items-center px-3 py-2">
              <Search className="text-gray-400 mr-2" size={18} />
              <input
                type="text"
                placeholder="ค้นหารุ่นรถ/เลขตัวถัง..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 text-sm bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400"
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
                  className="px-4 py-2.5 text-sm hover:bg-orange-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                >
                  <div className="font-semibold">{bike.model_name}</div>
                  <div className="text-xs text-slate-600">
                    {(bike as any).registration_plate || bike.model_code} • {bike.chassi || "ไม่มีเลขตัวถัง"}
                  </div>
                </li>
              ))}
          </ul>

          {/* ✅ ลงทะเบียนรถของลูกค้าที่ไม่ได้ซื้อกับเรา (เช่น มารับบริการเปลี่ยนถ่ายน้ำมันเครื่องอย่างเดียว) */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setRegisterDialogOpen(true);
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50 border-t border-gray-200 transition-colors"
          >
            <Plus size={16} />
            ลงทะเบียนรถใหม่ (ลูกค้าไม่ได้ซื้อกับเรา)
          </button>
        </div>
      )}

      <RegisterCustomerBikeDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        onRegistered={(bike) => handleSelectBike(bike)}
      />
    </div>
  );
};

export default OrderOwnedBikeSelect;