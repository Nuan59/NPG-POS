"use client";
// page.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/service-history/page.tsx
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Bike as BikeIcon, Gauge, Calendar, Receipt } from "lucide-react";
import Link from "next/link";
import { getDate } from "@/util/GetDateString";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Bike {
  id: number;
  model_name: string;
  model_code: string;
  chassi: string | null;
  registration_plate: string | null;
  category: "new" | "pre_owned" | "customer_owned";
  brand?: string;
}

interface Order {
  id: number;
  sale_date: string;
  customer: string;
  transaction_type?: string;
  transaction_type_detail?: string;
  mileage?: number | null;
  total?: number;
  notes?: string;
}

const transactionBadgeStyle: Record<string, string> = {
  "ขาย": "bg-blue-100 text-blue-800",
  "ซ่อม": "bg-orange-100 text-orange-800",
  "ต่อภาษี+พรบ": "bg-purple-100 text-purple-800",
  "อื่นๆ": "bg-gray-100 text-gray-800",
};

export default function ServiceHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  // ✅ ถ้ามาจากลิงก์ /service-history?bike=123 (เช่น จากหน้าลูกค้า) ให้เลือกรถคันนั้นให้อัตโนมัติ
  const bikeIdFromUrl = searchParams.get("bike");

  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loadingBikes, setLoadingBikes] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    const fetchBikes = async () => {
      const token = (session as any)?.user?.accessToken;
      if (!token) return;
      setLoadingBikes(true);
      try {
        const res = await fetch(`${API_BASE_URL}/inventory/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setBikes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("❌ fetchBikes error:", error);
        setBikes([]);
      } finally {
        setLoadingBikes(false);
      }
    };
    if (status === "authenticated") fetchBikes();
  }, [status, session]);

  const filteredBikes = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return bikes
      .filter((bike) =>
        `${bike.model_name} ${bike.model_code} ${bike.chassi || ""} ${bike.registration_plate || ""}`
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 20);
  }, [bikes, searchTerm]);

  const handleSelectBike = async (bike: Bike) => {
    setSelectedBike(bike);
    setSearchTerm("");
    setLoadingOrders(true);
    try {
      const token = (session as any)?.user?.accessToken;
      const res = await fetch(`${API_BASE_URL}/order/?bike=${bike.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list: Order[] = Array.isArray(data) ? data : [];
      // ล่าสุดขึ้นก่อน
      list.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
      setOrders(list);
    } catch (error) {
      console.error("❌ fetchOrders error:", error);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // ✅ พอโหลดรายชื่อรถเสร็จแล้ว ถ้ามี ?bike= ใน URL ให้เลือกคันนั้นให้อัตโนมัติ (ครั้งเดียว)
  useEffect(() => {
    if (!bikeIdFromUrl || loadingBikes || bikes.length === 0 || selectedBike) return;
    const found = bikes.find((b) => String(b.id) === bikeIdFromUrl);
    if (found) {
      handleSelectBike(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bikeIdFromUrl, loadingBikes, bikes]);

  const categoryLabel = (category: Bike["category"]) => {
    if (category === "customer_owned") return "รถลูกค้า (ไม่ได้ซื้อกับเรา)";
    if (category === "pre_owned") return "รถมือสอง";
    return "รถใหม่";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ประวัติการรับบริการ</h1>
        <p className="text-gray-600">ค้นหารถด้วยทะเบียน/เลขตัวถัง/รุ่น เพื่อดูประวัติการเข้ารับบริการทั้งหมด</p>
      </div>

      {/* ค้นหารถ */}
      <div className="relative max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="พิมพ์ทะเบียนรถ, เลขตัวถัง, หรือรุ่นรถ..."
            className="w-full pl-10 pr-4 py-3 text-base border-2 border-gray-300 rounded-lg outline-none focus:border-orange-400"
          />
        </div>

        {loadingBikes && (
          <p className="text-xs text-gray-400 mt-1">กำลังโหลดรายชื่อรถ...</p>
        )}

        {searchTerm.trim() !== "" && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {filteredBikes.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                ไม่พบรถที่ค้นหา
              </div>
            ) : (
              filteredBikes.map((bike) => (
                <button
                  key={bike.id}
                  onClick={() => handleSelectBike(bike)}
                  className="w-full text-left px-4 py-3 hover:bg-orange-50 border-b last:border-b-0 border-gray-100 transition-colors"
                >
                  <div className="font-medium">{bike.model_name}</div>
                  <div className="text-xs text-gray-500">
                    {bike.registration_plate || "ไม่มีทะเบียน"} • {bike.chassi || "ไม่มีเลขตัวถัง"} •{" "}
                    {categoryLabel(bike.category)}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ประวัติของรถที่เลือก */}
      {selectedBike && (
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b">
            <div className="bg-orange-100 p-3 rounded-lg">
              <BikeIcon className="text-orange-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{selectedBike.model_name}</h2>
              <p className="text-sm text-gray-500">
                {selectedBike.registration_plate || "ไม่มีทะเบียน"} •{" "}
                {selectedBike.chassi || "ไม่มีเลขตัวถัง"} • {categoryLabel(selectedBike.category)}
              </p>
            </div>
          </div>

          {loadingOrders ? (
            <p className="text-center text-gray-400 py-8">กำลังโหลดประวัติ...</p>
          ) : orders.length === 0 ? (
            <p className="text-center text-gray-400 py-8">รถคันนี้ยังไม่มีประวัติการเข้ารับบริการ</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const type = order.transaction_type || "ขาย";
                return (
                  <div key={order.id} className="border rounded-lg p-4 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            transactionBadgeStyle[type] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {type === "อื่นๆ" && order.transaction_type_detail
                            ? order.transaction_type_detail
                            : type}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={12} /> {getDate(order.sale_date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">ลูกค้า: {order.customer}</p>
                      {!!order.mileage && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Gauge size={14} /> เลขไมล์ {Number(order.mileage).toLocaleString()} กม.
                        </p>
                      )}
                      {order.notes && (
                        <p className="text-xs text-gray-400 mt-1 whitespace-pre-wrap">{order.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {!!order.total && (
                        <span className="font-semibold text-gray-800">
                          ฿{Number(order.total).toLocaleString()}
                        </span>
                      )}
                      <Link href={`/sales/${order.id}`}>
                        <button className="text-xs border rounded px-2 py-1 flex items-center gap-1 hover:bg-gray-50">
                          <Receipt size={12} /> ดูรายการ
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}