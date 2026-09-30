"use client";
// AnnouncementBar.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/AnnouncementBar.tsx
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAnnouncements, Announcement } from "@/services/AnnouncementService";

// ✅ โชว์สูงสุด 5 ประกาศที่เปิดอยู่ (ล่าสุดก่อน) ต่อกันเป็นแถบไหลเดียว - เกินนี้ตัดออก
const MAX_ANNOUNCEMENTS = 5;
// ✅ พิมพ์ข้อความซ้ำกี่รอบก่อนวนใหม่ - กันเคสข้อความสั้นแล้วดูเหมือนมีช่องว่าง ไม่ไหลเต็มจอ
const REPEAT_COUNT = 10;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

/**
 * แถบตัวหนังสือไหลใต้ Navbar - ใช้โทนสีเดียวกับ Navbar (เทาเข้มไล่สี + ขอบส้ม) ให้ดูเป็นเนื้อเดียวกัน
 * โชว์ประกาศที่ is_active=true สูงสุด 5 อัน (ต่อกันด้วย ★) กดที่แถบเปิดดูรายละเอียดเต็มได้
 * ไม่มีประกาศที่เปิดอยู่เลย -> ไม่แสดงอะไร (return null) กันเปลืองพื้นที่เปล่าๆ
 */
const AnnouncementBar = () => {
  const [active, setActive] = useState<Announcement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const all = await getAnnouncements();
      setActive(all.filter((a) => a.is_active).slice(0, MAX_ANNOUNCEMENTS));
      setLoaded(true);
    };
    load();
  }, []);

  if (!loaded || active.length === 0) return null;

  const text = active.map((a) => a.content).join("   ★   ");
  // ✅ ต่อข้อความซ้ำหลายรอบให้ยาวพอเสมอ แล้วค่อยแบ่งเป็น 2 ก้อนสำหรับลูปแบบไม่มีรอยต่อ
  const repeated = Array(REPEAT_COUNT).fill(text).join("   ★   ");

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="w-full relative overflow-hidden py-2.5 flex items-center shadow-lg cursor-pointer text-left border-b-2 border-orange-500 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900"
        title="กดเพื่อดูรายละเอียดประกาศ"
      >
        <div className="flex items-center gap-1.5 shrink-0 pl-4 pr-3 z-10 bg-gradient-to-r from-gray-900 via-gray-900 to-transparent">
          <span className="bg-orange-500 rounded-full p-1 flex items-center justify-center shadow-md shadow-orange-500/40">
            <Megaphone size={13} className="text-white" strokeWidth={2.5} />
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden whitespace-nowrap">
          <div className="inline-flex animate-marquee">
            <span className="mx-6 text-sm sm:text-base font-extrabold text-white tracking-wide">
              {repeated.split("★").map((part, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-orange-400 mx-1">★</span>}
                  {part}
                </span>
              ))}
            </span>
          </div>
        </div>
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="bg-orange-500 rounded-full p-1.5 flex items-center justify-center">
                <Megaphone size={16} className="text-white" strokeWidth={2.5} />
              </span>
              ประกาศ
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {active.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border bg-orange-50 border-orange-200">
                <p className="font-bold text-gray-800">{a.content}</p>
                {a.detail && (
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.detail}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  โดย {a.created_by} • {formatDate(a.created_at)}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
    </>
  );
};

export default AnnouncementBar;