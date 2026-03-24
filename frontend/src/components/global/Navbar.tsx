"use client";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import BirthdayNotification from "@/components/BirthdayNotification";
import NPGNotification from "@/components/Npgnotification";
import RegistrationExpiryNotification from '@/components/Registrationexpirynotification'

export const Navbar = () => {
  const { data: session } = useSession();
  const userInfo = session?.user;

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
    { href: "/issues", label: "กระทู้" },
    { href: "/employees", label: "พนักงาน", admin: true },
    { href: "/reports", label: "รายงาน", admin: true },
  ];

  return (
    <nav className="w-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 shadow-xl border-b-4 border-orange-500">
      <div className="px-8 py-5">
        <div className="flex justify-between items-center gap-6">
          
          {/* Logo */}
          <Link
            href="/dashboard"
            className="text-4xl font-black bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent hover:scale-105 transition-transform whitespace-nowrap"
          >
            คาราเมโล POS
          </Link>

          {/* Menu */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            {menuItems.map((item) => {
              if (item.admin && userInfo?.role !== "adm") return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-6 py-3 text-lg font-bold text-white rounded-xl hover:bg-orange-500 hover:shadow-lg hover:scale-105 transition-all duration-300 whitespace-nowrap"
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-orange-300">
              {userInfo?.name ?? userInfo?.username}
            </span>
            
            <BirthdayNotification />
            <RegistrationExpiryNotification />
            <NPGNotification />
            
            <button
              onClick={() => signOut()}
              className="p-3 rounded-xl hover:bg-orange-500 hover:shadow-lg hover:scale-110 transition-all duration-300"
              title="ออกจากระบบ"
            >
              <LogOut size={24} strokeWidth={2.5} className="text-white" />
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
};