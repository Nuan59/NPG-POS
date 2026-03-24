"use client";
import {
  ShoppingCart,
  UsersRound,
  Receipt,
  Warehouse,
  Contact,
  LineChart,
  Gift,
  Calculator,
  CreditCard,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import React from "react";

const menuPages = [
  {
    href: "/sales",
    gradient: "from-orange-400 to-orange-600",
    hoverGradient: "hover:from-orange-500 hover:to-orange-700",
    icon: <Receipt size={"2.5rem"} />,
    label: "ขาย",
    description: "สร้างคำสั่งซื้อใหม่",
  },
  {
    href: "/customers",
    gradient: "from-blue-400 to-blue-600",
    hoverGradient: "hover:from-blue-500 hover:to-blue-700",
    icon: <UsersRound size={"2.5rem"} />,
    label: "ลูกค้า",
    description: "จัดการข้อมูลลูกค้า",
  },
  {
    href: "/inventory",
    gradient: "from-emerald-400 to-emerald-600",
    hoverGradient: "hover:from-emerald-500 hover:to-emerald-700",
    icon: <ShoppingCart size={"2.5rem"} />,
    label: "สินค้า",
    description: "คลังสินค้าทั้งหมด",
  },
  {
    href: "/gifts",
    gradient: "from-pink-400 to-pink-600",
    hoverGradient: "hover:from-pink-500 hover:to-pink-700",
    icon: <Gift size={"2.5rem"} />,
    label: "ของแถม",
    description: "จัดการของแถม",
  },
  {
    href: "/npg",
    gradient: "from-purple-400 to-purple-600",
    hoverGradient: "hover:from-purple-500 hover:to-purple-700",
    icon: <CreditCard size={"2.5rem"} />,
    label: "NPG",
    description: "ระบบไฟแนนซ์",
  },
  {
    href: "/storage",
    gradient: "from-amber-400 to-amber-600",
    hoverGradient: "hover:from-amber-500 hover:to-amber-700",
    icon: <Warehouse size={"2.5rem"} />,
    label: "คลัง",
    description: "สถานที่จัดเก็บ",
  },
  {
    href: "/registration",
    gradient: "from-cyan-400 to-cyan-600",
    hoverGradient: "hover:from-cyan-500 hover:to-cyan-700",
    icon: <BookOpen size={"2.5rem"} />,
    label: "ทะเบียน",
    description: "จัดการทะเบียนรถ",
  },
  {
    href: "/installment",
    gradient: "from-slate-400 to-slate-600",
    hoverGradient: "hover:from-slate-500 hover:to-slate-700",
    icon: <Calculator size={"2.5rem"} />,
    label: "คำนวณ",
    description: "คำนวณค่างวด",
  },
  {
    href: "/issues",
    gradient: "from-indigo-400 to-indigo-600",
    hoverGradient: "hover:from-indigo-500 hover:to-indigo-700",
    icon: <MessageSquare size={"2.5rem"} />,
    label: "กระทู้",
    description: "แจ้งปัญหา/สอบถาม",
  },
  {
    href: "/employees",
    gradient: "from-teal-400 to-teal-600",
    hoverGradient: "hover:from-teal-500 hover:to-teal-700",
    icon: <Contact size={"2.5rem"} />,
    label: "พนักงาน",
    description: "จัดการพนักงาน",
    admin: true,
  },
  {
    href: "/reports",
    gradient: "from-rose-400 to-rose-600",
    hoverGradient: "hover:from-rose-500 hover:to-rose-700",
    icon: <LineChart size={"2.5rem"} />,
    label: "รายงาน",
    description: "รายงานและสถิติ",
    admin: true,
  },
];

const MenuItems = () => {
  const { data: session } = useSession();
  const userInfo = session?.user;

  return (
    <div className="grid grid-cols-3 gap-6 mt-8">
      {menuPages.map((item) => {
        // ถ้าเป็น admin menu แต่ user ไม่ใช่ admin ให้ skip
        if (item.admin && userInfo?.role !== "adm") {
          return null;
        }

        return (
          <a key={item.href} href={item.href} className="block">
            <div
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.gradient} ${item.hoverGradient} shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer h-40`}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white rounded-full"></div>
                <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-white rounded-full"></div>
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col justify-between p-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-1">{item.label}</h3>
                  <p className="text-sm text-white/90">{item.description}</p>
                </div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </div>
          </a>
        );
      })}
    </div>
  );
};

export default MenuItems;