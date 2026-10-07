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
import { getAnnouncements, getAnnouncementSettings, Announcement } from "@/services/AnnouncementService";

// ✅ โชว์สูงสุด 5 ประกาศที่เปิดอยู่ (ล่าสุดก่อน) ต่อกันเป็นแถบไหลเดียว - เกินนี้ตัดออก
const MAX_ANNOUNCEMENTS = 5;
// ✅ พิมพ์ข้อความซ้ำกี่รอบก่อนวนใหม่ - กันเคสข้อความสั้นแล้วดูเหมือนมีช่องว่าง ไม่ไหลเต็มจอ
const REPEAT_COUNT = 10;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

/**
 * แถบตัวหนังสือไหลใต้ Navbar - แบบ G: ส้มไล่เฉด + ลายเส้นเฉียงจางๆ + ดาวประกายคั่นข้อความ
 * ความเร็ว (animation-duration) ดึงมาจาก /announcements/settings/ จริง - ตั้งได้จากหน้า "กระทู้" (admin เท่านั้น)
 * โชว์ประกาศที่ is_active=true สูงสุด 5 อัน กดที่แถบเปิดดูรายละเอียดเต็มได้
 * ไม่มีประกาศที่เปิดอยู่เลย -> ไม่แสดงอะไร (return null) กันเปลืองพื้นที่เปล่าๆ
 */
const AnnouncementBar = () => {
  const [active, setActive] = useState<Announcement[]>([]);
  const [speedSeconds, setSpeedSeconds] = useState<number>(40);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [all, settings] = await Promise.all([getAnnouncements(), getAnnouncementSettings()]);
      setActive(all.filter((a) => a.is_active).slice(0, MAX_ANNOUNCEMENTS));
      setSpeedSeconds(settings.speed_seconds || 40);
      setLoaded(true);
    };
    load();
  }, []);

  if (!loaded || active.length === 0) return null;

  // ✅ 1 ชุด = ทุกประกาศ คั่นด้วยดาวประกาย / พิมพ์ซ้ำเป็นจำนวนคู่ เลื่อน -50% แล้ววนต่อได้ไม่มีรอยต่อ
  const copies = Array.from({ length: REPEAT_COUNT });
  const Sparkle = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0 mx-6" fill="#FFE0C2" aria-hidden="true">
      <path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0z" />
    </svg>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="w-full relative overflow-hidden h-9 flex items-center gap-3 px-3 sm:px-6 cursor-pointer text-left text-white"
        style={{
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 10px, rgba(255,255,255,0) 10px 22px)," +
            "linear-gradient(90deg, #E25A0E 0%, #F47B2E 50%, #E25A0E 100%)",
          boxShadow: "0 4px 12px -6px rgba(226,90,14,0.6)",
        }}
        title="กดเพื่อดูรายละเอียดประกาศ"
      >
        {/* ป้าย "ประกาศ" สีขาว + จุดเขียวกะพริบ */}
        <span className="shrink-0 z-10 flex items-center gap-1.5 h-6 pl-2 pr-3 rounded-full bg-white text-[#D9480F] text-[14px] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.15)]">
          <span className="live-dot h-[7px] w-[7px] rounded-full bg-green-500" />
          <Megaphone size={14} strokeWidth={2.2} />
          <span className="hidden sm:inline">ประกาศ</span>
        </span>

        <div className="relative flex-1 min-w-0 overflow-hidden whitespace-nowrap">
          <div
            className="inline-flex items-center animate-marquee text-[15px] sm:text-base font-semibold tracking-wide [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"
            style={{ animationDuration: `${speedSeconds}s` }}
          >
            {copies.map((_, c) =>
              active.map((a) => (
                <span key={`${c}-${a.id}`} className="inline-flex items-center">
                  {a.content}
                  <Sparkle />
                </span>
              ))
            )}
          </div>
        </div>

        {/* จำนวนประกาศ */}
        <span className="shrink-0 z-10 text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-[rgba(40,20,8,0.35)] border border-white/20 whitespace-nowrap">
          {active.length} ประกาศ
        </span>
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
          animation-name: marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes liveDot {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.85);
          }
        }
        .live-dot {
          animation: liveDot 1.6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default AnnouncementBar;