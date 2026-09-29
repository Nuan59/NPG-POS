"use client";
// AnnouncementBar.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/AnnouncementBar.tsx
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { getAnnouncements } from "@/services/AnnouncementService";

/**
 * แถบตัวหนังสือไหลใต้ Navbar - โชว์ประกาศที่ is_active=true ทั้งหมด (ต่อกันด้วย •)
 * ไม่มีประกาศที่เปิดอยู่เลย -> ไม่แสดงอะไร (return null) กันเปลืองพื้นที่เปล่าๆ
 */
const AnnouncementBar = () => {
  const [text, setText] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const all = await getAnnouncements();
      const active = all.filter((a) => a.is_active);
      setText(active.map((a) => a.content).join("   •   "));
      setLoaded(true);
    };
    load();
  }, []);

  if (!loaded || !text) return null;

  return (
    <div className="w-full bg-orange-600 text-white overflow-hidden py-1.5 flex items-center">
      <Megaphone size={16} className="shrink-0 ml-4 mr-2" />
      <div className="relative flex-1 overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-marquee">
          <span className="mx-8 text-sm font-medium">{text}</span>
          <span className="mx-8 text-sm font-medium">{text}</span>
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
          animation: marquee 22s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AnnouncementBar;