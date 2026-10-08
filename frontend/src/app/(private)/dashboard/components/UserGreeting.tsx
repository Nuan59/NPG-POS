"use client";
import { useSession } from "next-auth/react";
import { Calendar, Clock } from "lucide-react";
import React, { useState, useEffect } from "react";

const UserGreeting = () => {
  const { data: session } = useSession();
  const userInfo = session?.user;
  const [now, setNow] = useState<Date | null>(null);

  // render เวลาเฉพาะฝั่ง client กัน hydration error
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = (() => {
    if (!now) return "สวัสดี";
    const h = now.getHours();
    if (h < 12) return "สวัสดีตอนเช้า";
    if (h < 18) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  })();

  const dateText = now
    ? now.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
    : "กำลังโหลด...";
  const dayText = now ? now.toLocaleDateString("th-TH", { weekday: "long" }) : "";
  const timeText = now
    ? now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    : "--:--:--";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#1e2432] text-white px-5 py-6 sm:px-8 sm:py-7">
      {/* แถบส้มเฉียง */}
      <div className="absolute top-0 bottom-0 -right-16 w-32 sm:w-80 bg-orange-500 -skew-x-[18deg]" />
      <div className="hidden sm:block absolute top-0 bottom-0 right-[250px] w-[18px] bg-orange-400/60 -skew-x-[18deg]" />

      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-300">{greeting}</p>
          <h1 className="text-2xl sm:text-[34px] font-semibold mt-0.5 mb-3 sm:mb-4 leading-tight">
            คุณ<span className="text-orange-400">{userInfo?.name ?? (userInfo as any)?.username}</span>
          </h1>
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg">
              <Calendar size={15} />
              <span>{dateText}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg sm:hidden">
              <Clock size={15} />
              <span className="font-mono font-semibold">{timeText}</span>
            </div>
          </div>
        </div>

        {/* นาฬิกาใหญ่ (จอใหญ่) */}
        <div className="hidden sm:block text-right">
          <p className="text-xs opacity-90">{dayText}</p>
          <p className="font-mono text-3xl font-semibold leading-tight">{timeText}</p>
        </div>
      </div>
    </div>
  );
};

export default UserGreeting;