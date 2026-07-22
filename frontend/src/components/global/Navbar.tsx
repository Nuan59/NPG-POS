"use client";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import BirthdayNotification from "@/components/BirthdayNotification";
import NPGNotification from "@/components/Npgnotification";
import RegistrationExpiryNotification from '@/components/Registrationexpirynotification';
import { useState } from "react";

export const Navbar = () => {
  const { data: session } = useSession();
  const userInfo = session?.user;
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { href: "/dashboard", label: "หน้าหลัก" },
    { href: "/sales", label: "ขาย" },
    { href: "/customers", label: "ลูกค้า" },
    { href: "/inventory", label: "สินค้า" },
    { href: "/storage", label: "คลัง" },
    { href: "/gifts", label: "ของแถม" },
    { href: "/registration", label: "ทะเบียน" },
    { href: "/installment", label: "คำนวณ" },
    { href: "/npg", label: "NPG" },
    { href: "/cashflow", label: "รายรับ-รายจ่าย" },
    { href: "/issues", label: "กระทู้" },
    { href: "/employees", label: "พนักงาน", admin: true },
    { href: "/reports", label: "รายงาน", admin: true },
  ];

  const visibleItems = menuItems.filter(
    (item) => !item.admin || userInfo?.role === "adm"
  );

  return (
    <nav className="w-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 shadow-xl border-b-4 border-orange-500">
      <div className="px-3 sm:px-8 py-3 sm:py-5">
        <div className="flex justify-between items-center gap-3">

          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-xl sm:text-4xl font-black bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent hover:scale-105 transition-transform whitespace-nowrap"
          >
            คาราเมโล POS
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-base font-bold text-white rounded-xl hover:bg-orange-500 hover:shadow-lg hover:scale-105 transition-all duration-300 whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:block text-sm sm:text-lg font-bold text-orange-300">
              {userInfo?.name ?? userInfo?.username}
            </span>
            <BirthdayNotification />
            <RegistrationExpiryNotification />
            <NPGNotification />
            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl hover:bg-orange-500 hover:shadow-lg hover:scale-110 transition-all duration-300"
              title="ออกจากระบบ"
            >
              <LogOut size={20} strokeWidth={2.5} className="text-white" />
            </button>

            {/* Hamburger - mobile only */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-orange-500 transition-all"
            >
              {menuOpen
                ? <X size={24} className="text-white" />
                : <Menu size={24} className="text-white" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="lg:hidden bg-gray-900 border-t border-gray-700 px-3 pb-3">
          <div className="grid grid-cols-3 gap-2 pt-3">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="text-center px-2 py-3 text-sm font-bold text-white rounded-xl bg-gray-700 hover:bg-orange-500 transition-all duration-200"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};