"use client";
import { useSession } from "next-auth/react";
import { Calendar, Clock } from "lucide-react";
import React, { useState, useEffect } from "react";

const UserGreeting = () => {
  const { data: session } = useSession();
  const userInfo = session?.user;
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // ✅ แก้ hydration error: render เฉพาะฝั่ง client
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    if (!currentTime) return "สวัสดี";
    const hour = currentTime.getHours();
    if (hour < 12) return "สวัสดีตอนเช้า";
    if (hour < 18) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-xl p-8 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-medium opacity-90 mb-1">{getGreeting()}</p>
          <h1 className="text-4xl font-black mb-4">
            คุณ{userInfo?.name ?? userInfo?.username}
          </h1>
          
          <div className="flex items-center gap-6 text-sm">
            {/* ✅ แสดงเฉพาะเมื่อ currentTime มีค่าแล้ว */}
            {currentTime ? (
              <>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <Calendar size={18} />
                  <span className="font-medium">{formatDate(currentTime)}</span>
                </div>
                
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <Clock size={18} />
                  <span className="font-medium font-mono">{formatTime(currentTime)}</span>
                </div>
              </>
            ) : (
              /* ✅ แสดง placeholder ระหว่างรอ */
              <>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <Calendar size={18} />
                  <span className="font-medium">กำลังโหลด...</span>
                </div>
                
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <Clock size={18} />
                  <span className="font-medium font-mono">--:--:--</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Decorative Circle */}
        <div className="hidden md:block">
          <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <div className="w-24 h-24 bg-white/20 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGreeting;