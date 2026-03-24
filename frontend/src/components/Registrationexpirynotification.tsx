"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Car, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

interface IRegistrationExpiry {
  id: number; // Order ID
  customer?: {
    id: number;
    name: string;
    phone: string;
  } | null;
  bike?: {
    id: number;
    model_name: string;
    model_code: string;
    registration_plate?: string;
  } | null;
  registration_expiry_date: string;
  days_until_expiry: number;
  urgency: 'critical' | 'warning';
}

const RegistrationExpiryNotification = () => {
  const { data: session } = useSession();
  const [expiringOrders, setExpiringOrders] = useState<IRegistrationExpiry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadExpiringRegistrations = useCallback(async () => {
    // ถ้ายังไม่ login ก็ไม่ต้องเรียก API
    if (!session) {
      setLoading(false);
      return;
    }

    console.log("🚗 Loading expiring registrations...");
    setLoading(true);
    
    try {
      // เรียก Next.js API Route แทนการเรียก Backend โดยตรง
      const response = await fetch('/api/registration', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error(`❌ API error: ${response.status}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("📋 Expiring registrations:", data);
      
      setExpiringOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Error loading expiring registrations:", error);
    }
    
    setLoading(false);
  }, [session]);

  useEffect(() => {
    loadExpiringRegistrations();
    // Auto-refresh ทุก 1 ชั่วโมง
    const interval = setInterval(loadExpiringRegistrations, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadExpiringRegistrations]);

  const getDaysText = (days: number) => {
    if (days === 0) return "หมดอายุวันนี้!";
    if (days === 1) return "หมดอายุพรุ่งนี้";
    if (days <= 7) return `หมดอายุใน ${days} วัน`;
    if (days <= 30) return `หมดอายุใน ${days} วัน`;
    return `หมดอายุอีก ${days} วัน`;
  };

  const criticalCount = expiringOrders.filter(o => o.urgency === 'critical').length;
  const warningCount = expiringOrders.filter(o => o.urgency === 'warning').length;

  return (
    <div className="relative">
      {/* Car Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-700 transition-colors"
      >
        <Car size={24} className="text-slate-200" />
        
        {expiringOrders.length > 0 && (
          <span className={`absolute top-0 right-0 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
            criticalCount > 0 ? 'bg-red-500' : 'bg-orange-500'
          }`}>
            {expiringOrders.length > 9 ? "9+" : expiringOrders.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Car size={24} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">ทะเบียนหมดอายุ</h3>
                {criticalCount > 0 && (
                  <p className="text-xs text-red-600 font-semibold">
                    {criticalCount} คัน หมดอายุภายใน 1 เดือน!
                  </p>
                )}
                {warningCount > 0 && criticalCount === 0 && (
                  <p className="text-xs text-orange-600">
                    {warningCount} คัน หมดอายุภายใน 3 เดือน
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                กำลังโหลด...
              </div>
            ) : expiringOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Car size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">ไม่มีทะเบียนที่กำลังจะหมดอายุ</p>
                <p className="text-sm">ทะเบียนทั้งหมดยังอยู่ในวันที่กำหนด</p>
              </div>
            ) : (
              <div className="divide-y">
                {expiringOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/sales/${order.id}`}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className={`flex items-start gap-3 ${
                      order.urgency === 'critical' ? 'border-l-4 border-red-500 pl-3' : 'border-l-4 border-orange-400 pl-3'
                    }`}>
                      <AlertTriangle 
                        size={20} 
                        className={order.urgency === 'critical' ? 'text-red-500 mt-1' : 'text-orange-500 mt-1'} 
                      />
                      <div className="flex-1">
                        {order.bike && (
                          <div className="font-semibold text-gray-800">
                            {order.bike.model_name}
                          </div>
                        )}
                        {order.bike && (
                          <div className="text-sm text-gray-600">
                            {order.bike.model_code}
                            {order.bike.registration_plate && ` • ${order.bike.registration_plate}`}
                          </div>
                        )}
                        
                        {order.customer && (
                          <div className="text-sm text-gray-600 mt-1">
                            👤 {order.customer.name}
                            {order.customer.phone && ` • ${order.customer.phone}`}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            order.urgency === 'critical' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {getDaysText(order.days_until_expiry)}
                          </span>
                          <span className="text-xs text-gray-500">
                            หมดวันที่: {new Date(order.registration_expiry_date).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationExpiryNotification;