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
  Wallet,
  ChevronRight,
} from "lucide-react";
import React from "react";
import { useEmployeePermissions } from "@/app/hooks/useEmployeePermissions";
import { getRequiredPermission } from "@/util/RoutePermissions";

const menuPages = [
  { href: "/sales", icon: Receipt, label: "ขาย", description: "สร้างคำสั่งซื้อใหม่", primary: true },
  { href: "/customers", icon: UsersRound, label: "ลูกค้า", description: "จัดการข้อมูลลูกค้า" },
  { href: "/inventory", icon: ShoppingCart, label: "สินค้า", description: "คลังสินค้าทั้งหมด" },
  { href: "/gifts", icon: Gift, label: "ของแถม", description: "จัดการของแถม" },
  { href: "/npg", icon: CreditCard, label: "NPG", description: "ระบบไฟแนนซ์" },
  { href: "/storage", icon: Warehouse, label: "คลัง", description: "สถานที่จัดเก็บ" },
  { href: "/cashflow", icon: Wallet, label: "รายรับ-รายจ่าย", description: "เงินสด/โอนรายวัน" },
  { href: "/registration", icon: BookOpen, label: "ทะเบียน", description: "จัดการทะเบียนรถ" },
  { href: "/installment", icon: Calculator, label: "คำนวณ", description: "คำนวณค่างวด" },
  { href: "/issues", icon: MessageSquare, label: "กระทู้", description: "แจ้งปัญหา/สอบถาม" },
  { href: "/employees", icon: Contact, label: "พนักงาน", description: "จัดการพนักงาน" },
  { href: "/reports", icon: LineChart, label: "รายงาน", description: "รายงานและสถิติ" },
];

const MenuItems = () => {
  const { loaded, canAccess } = useEmployeePermissions();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {menuPages.map((item) => {
        // ซ่อนการ์ดตามสิทธิ์จริง
        const requiredPermission = getRequiredPermission(item.href);
        if (requiredPermission) {
          if (!loaded) return null;
          if (!canAccess(requiredPermission)) return null;
        }

        const Icon = item.icon;
        const primary = !!item.primary;

        return (
          <a
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-2xl border p-3 sm:p-4 transition-all duration-200 hover:-translate-y-0.5 ${
              primary
                ? "bg-orange-500 border-orange-500 text-white hover:shadow-[0_8px_20px_rgba(242,107,29,0.3)]"
                : "bg-white border-gray-200 text-gray-800 hover:border-orange-500 hover:shadow-[0_8px_20px_rgba(242,107,29,0.12)]"
            }`}
          >
            <div
              className={`flex-none w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center ${
                primary ? "bg-white/20 text-white" : "bg-orange-50 text-orange-500"
              }`}
            >
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[15px] leading-tight">{item.label}</p>
              <p
                className={`hidden sm:block text-xs truncate ${
                  primary ? "text-orange-100" : "text-gray-500"
                }`}
              >
                {item.description}
              </p>
            </div>
            <ChevronRight
              size={18}
              className={`hidden sm:block ml-auto flex-none transition-transform group-hover:translate-x-0.5 ${
                primary ? "text-white" : "text-gray-300 group-hover:text-orange-500"
              }`}
            />
          </a>
        );
      })}
    </div>
  );
};

export default MenuItems;