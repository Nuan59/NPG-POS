"use client";
// AnnouncementBar.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/AnnouncementBar.tsx
import { useEffect, useState } from "react";
import { Megaphone, Sparkles } from "lucide-react";
import { getAnnouncements } from "@/services/AnnouncementService";

// ✅ โชว์สูงสุด 5 ประกาศที่เปิดอยู่ (ล่าสุดก่อน) ต่อกันเป็นแถบไหลเดียว - เกินนี้ตัดออก
const MAX_ANNOUNCEMENTS = 5;
// ✅ พิมพ์ข้อความซ้ำกี่รอบก่อนวนใหม่ - กันเคสข้อความสั้นแล้วดูเหมือนมีช่องว่าง ไม่ไหลเต็มจอ
const REPEAT_COUNT = 10;

/**
 * แถบตัวหนังสือไหลใต้ Navbar - โชว์ประกาศที่ is_active=true สูงสุด 5 อัน (ต่อกันด้วย ★)
 * พิมพ์ซ้ำหลายรอบเสมอเพื่อให้ไหลเต็มความกว้างจอไม่มีช่วงว่าง ไม่ว่าข้อความจะสั้นแค่ไหน
 * ไม่มีประกาศที่เปิดอยู่เลย -> ไม่แสดงอะไร (return null) กันเปลืองพื้นที่เปล่าๆ
 */
const AnnouncementBar = () => {
  const [text, setText] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const all = await getAnnouncements();
      const active = all.filter((a) => a.is_active).slice(0, MAX_ANNOUNCEMENTS);
      setText(active.map((a) => a.content).join("   ★   "));
      setLoaded(true);
    };
    load();
  }, []);

  if (!loaded || !text) return null;

  // ✅ ต่อข้อความซ้ำหลายรอบให้ยาวพอเสมอ แล้วค่อยแบ่งเป็น 2 ก้อนสำหรับลูปแบบไม่มีรอยต่อ
  const repeated = Array(REPEAT_COUNT).fill(text).join("   ★   ");

  return (
    <div className="w-full relative overflow-hidden py-2 flex items-center shadow-md bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600">
      <div className="flex items-center gap-1.5 shrink-0 pl-4 pr-3 z-10 bg-gradient-to-r from-orange-600 via-orange-600 to-transparent">
        <Megaphone size={17} className="text-white drop-shadow" />
        <Sparkles size={12} className="text-yellow-200" />
      </div>
      <div className="relative flex-1 overflow-hidden whitespace-nowrap">
        <div className="inline-flex animate-marquee">
          <span className="mx-6 text-sm font-bold text-white tracking-wide drop-shadow-sm">
            {repeated}
          </span>
          <span className="mx-6 text-sm font-bold text-white tracking-wide drop-shadow-sm">
            {repeated}
          </span>
        </div>
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AnnouncementBar;