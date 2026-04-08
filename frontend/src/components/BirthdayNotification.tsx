"use client";

import { useEffect, useState } from "react";
import { Bell, Cake, Phone, X } from "lucide-react";
import Link from "next/link";

interface ICustomer {
  id: number;
  name: string;
  phone: string;
  dob: string | null;
}

interface IBirthdayCustomer extends ICustomer {
  daysUntil: number;
}

const findUpcomingBirthdays = (customers: ICustomer[]): IBirthdayCustomer[] => {
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  return customers
    .filter((c) => c.dob)
    .map((c) => {
      const dob = new Date(c.dob!);
      const birthMonth = dob.getMonth() + 1;
      const birthDay = dob.getDate();
      let daysUntil = 0;

      if (birthMonth === todayMonth && birthDay === todayDay) {
        daysUntil = 0;
      } else {
        const thisYear = today.getFullYear();
        const birthdayThisYear = new Date(thisYear, birthMonth - 1, birthDay);
        if (birthdayThisYear < today) {
          const birthdayNextYear = new Date(thisYear + 1, birthMonth - 1, birthDay);
          daysUntil = Math.floor((birthdayNextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          daysUntil = Math.floor((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      return { ...c, daysUntil };
    })
    .filter((c) => c.daysUntil >= 0 && c.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);
};

const BirthdayNotification = () => {
  const [birthdays, setBirthdays] = useState<IBirthdayCustomer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ ย้าย loadBirthdays เข้ามาใน useEffect เพื่อไม่ต้องใส่ใน dependency
    const loadBirthdays = async () => {
      console.log("🔍 Loading birthdays...");
      setLoading(true);

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL;
        if (!apiBase) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${apiBase}/customers`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          setLoading(false);
          return;
        }

        const customers = await response.json();
        setBirthdays(findUpcomingBirthdays(customers));
      } catch (error) {
        console.error("❌ Error loading birthdays:", error);
      }

      setLoading(false);
    };

    loadBirthdays();
    const interval = setInterval(loadBirthdays, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []); // ✅ [] — รันครั้งเดียวตอน mount

  const getDaysText = (days: number) => {
    if (days === 0) return "วันนี้! 🎉";
    if (days === 1) return "พรุ่งนี้";
    if (days === 2) return "มะรืนนี้";
    return `อีก ${days} วัน`;
  };

  const todayCount = birthdays.filter((b) => b.daysUntil === 0).length;
  const upcomingCount = birthdays.filter((b) => b.daysUntil > 0).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-700 transition-colors"
      >
        <Bell size={24} className="text-slate-200" />
        {birthdays.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {birthdays.length > 9 ? "9+" : birthdays.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-[600px] flex flex-col border">
            <div className="p-4 border-b bg-gradient-to-r from-pink-50 to-purple-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                  <Cake className="text-pink-500" size={20} />
                  แจ้งเตือนวันเกิด
                </h3>
                {todayCount > 0 && (
                  <p className="text-sm text-pink-600 font-medium">วันนี้มี {todayCount} คน 🎂</p>
                )}
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-200 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto" />
                  <p className="mt-2">กำลังโหลด...</p>
                </div>
              ) : birthdays.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Cake size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">ไม่มีลูกค้าวันเกิดในช่วงนี้</p>
                  <p className="text-sm mt-1">7 วันข้างหน้า</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {birthdays.map((customer) => (
                    <Link
                      key={customer.id}
                      href={`/customers/${customer.id}`}
                      onClick={() => setIsOpen(false)}
                      className="block hover:bg-gray-50 transition-colors p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{customer.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-sm font-medium ${customer.daysUntil === 0 ? "text-pink-600" : "text-purple-600"}`}>
                              {getDaysText(customer.daysUntil)}
                            </span>
                            {customer.daysUntil === 0 && <span className="text-lg">🎂</span>}
                          </div>
                        </div>
                        {customer.daysUntil === 0 && (
                          <div className="bg-pink-100 text-pink-700 text-xs font-bold px-2 py-1 rounded-full">วันนี้!</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={14} />
                        <span>{customer.phone}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {birthdays.length > 0 && (
              <div className="p-3 border-t bg-gray-50">
                <div className="text-center text-sm text-gray-600">
                  {todayCount > 0 && <span className="text-pink-600 font-medium">วันนี้ {todayCount} คน</span>}
                  {todayCount > 0 && upcomingCount > 0 && " • "}
                  {upcomingCount > 0 && <span>ใกล้ถึง {upcomingCount} คน</span>}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BirthdayNotification;