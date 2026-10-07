"use client";
// Navbar.tsx — แบบ G (ธีมเดิม แบบตกแต่ง)
// วางไฟล์นี้ทับของเดิม (ที่เดียวกับ Navbar.tsx ตัวเก่า)
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  X,
  Home,
  ShoppingCart,
  Users,
  Bike,
  Warehouse,
  Gift,
  FileText,
  History,
  Calculator,
  Landmark,
  Banknote,
  MessageSquare,
  UserCog,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import BirthdayNotification from "@/components/BirthdayNotification";
import NPGNotification from "@/components/Npgnotification";
import RegistrationExpiryNotification from "@/components/Registrationexpirynotification";
import TaskNotificationIcon from "@/components/global/TaskNotificationIcon";
import { useState } from "react";
import { useEmployeePermissions } from "@/app/hooks/useEmployeePermissions";
import { getRequiredPermission } from "@/util/RoutePermissions";

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const menuItems: MenuItem[] = [
  { href: "/dashboard", label: "หน้าหลัก", icon: Home },
  { href: "/sales", label: "ขาย", icon: ShoppingCart },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/inventory", label: "สินค้า", icon: Bike },
  { href: "/storage", label: "คลัง", icon: Warehouse },
  { href: "/gifts", label: "ของแถม", icon: Gift },
  { href: "/registration", label: "ทะเบียน", icon: FileText },
  { href: "/service-history", label: "ประวัติรถ", icon: History },
  { href: "/installment", label: "คำนวณ", icon: Calculator },
  { href: "/npg", label: "NPG", icon: Landmark },
  { href: "/cashflow", label: "รายรับ-รายจ่าย", icon: Banknote },
  { href: "/issues", label: "กระทู้", icon: MessageSquare },
  { href: "/employees", label: "พนักงาน", icon: UserCog },
  { href: "/reports", label: "รายงาน", icon: BarChart3 },
];

// ✅ เมนูที่เลือกอยู่ - ปุ่มส้มไล่เฉด + แสงเรืองใต้ปุ่ม
const ACTIVE_STYLE: React.CSSProperties = {
  background: "linear-gradient(180deg, #FF8A3D, #EE6416)",
  boxShadow: "0 8px 18px -6px rgba(242,107,29,0.75), inset 0 1px 0 rgba(255,255,255,0.3)",
};

export const Navbar = () => {
  const { data: session } = useSession();
  const userInfo = session?.user as any;
  const pathname = usePathname() || "";
  const [menuOpen, setMenuOpen] = useState(false);
  const { loaded, canAccess } = useEmployeePermissions();

  // ✅ ซ่อนเมนูตามสิทธิ์จริง (permissions ที่ตั้งไว้ในหน้าจัดการพนักงาน)
  // ระหว่างที่ยังโหลดสิทธิ์ไม่เสร็จ ไม่แสดงเมนูที่ต้องเช็คสิทธิ์ไปก่อน กันเมนู flash ขึ้นมาแล้วหายไป
  const visibleItems = menuItems.filter((item) => {
    const requiredPermission = getRequiredPermission(item.href);
    if (!requiredPermission) return true; // หน้าหลัก เข้าได้เสมอ
    if (!loaded) return false;
    return canAccess(requiredPermission);
  });

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const displayName: string = userInfo?.name ?? userInfo?.username ?? "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <nav className="w-full relative">
      {/* เส้นส้มไล่เฉดบางๆ ขอบบนสุด */}
      <div className="h-[3px]" style={{ background: "linear-gradient(90deg, #F26B1D, #FFB27A 50%, #F26B1D)" }} />

      <div
        className="relative text-[#B9C1CD] shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
        style={{
          background:
            "radial-gradient(520px 140px at 0% 0%, rgba(242,107,29,0.24), rgba(242,107,29,0) 70%)," +
            "radial-gradient(420px 120px at 100% 100%, rgba(242,107,29,0.10), rgba(242,107,29,0) 70%)," +
            "linear-gradient(180deg, #323B4A 0%, #252C38 100%)",
        }}
      >
        <div className="flex items-center gap-3 px-3 sm:px-6 h-16 xl:h-[77px]">
          {/* โลโก้ */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <span
              className="w-9 h-9 xl:w-[42px] xl:h-[42px] rounded-[12px] flex items-center justify-center text-white transition-transform group-hover:scale-105"
              style={{
                background: "linear-gradient(145deg, #FF9A52, #E85D10)",
                boxShadow: "0 6px 18px -6px rgba(242,107,29,0.8), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}
            >
              <Bike size={22} strokeWidth={1.8} />
            </span>
            <span className="flex flex-col leading-[1.05]">
              <span className="flex items-center gap-1.5">
                <span
                  className="font-medium text-xl xl:text-[25px] bg-clip-text text-transparent whitespace-nowrap"
                  style={{ backgroundImage: "linear-gradient(180deg, #FFB27A, #F47B2E)" }}
                >
                  คาราเมโล
                </span>
                <span className="text-[10px] font-semibold tracking-[1.5px] text-[#FFB27A] border border-[#FFB27A]/50 rounded-[5px] px-1.5">
                  POS
                </span>
              </span>
              <span className="hidden 2xl:block text-[11px] text-[#7E8898] tracking-wide">นพดลมอเตอร์กรุ้ป</span>
            </span>
          </Link>

          {/* เมนู (จอใหญ่) - ไอคอนเหนือชื่อ */}
          <div className="hidden xl:flex flex-1 min-w-0 items-center justify-center gap-px">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={active ? ACTIVE_STYLE : undefined}
                  className={`flex flex-col items-center gap-[3px] rounded-xl px-1.5 2xl:px-2.5 py-[7px] text-[12px] 2xl:text-[12.5px] whitespace-nowrap transition-colors ${
                    active ? "text-white px-3 2xl:px-3.5" : "hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon size={19} strokeWidth={active ? 1.9 : 1.7} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* ขวา: แจ้งเตือน + ผู้ใช้ */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto xl:ml-0 shrink-0 text-[#E4E8EE]">
            <div className="nav-icon"><BirthdayNotification /></div>
            <div className="nav-icon"><RegistrationExpiryNotification /></div>
            <div className="nav-icon"><NPGNotification /></div>
            <div className="nav-icon"><TaskNotificationIcon /></div>

            <div className="hidden sm:flex items-center gap-2 ml-1 p-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-[15px] shadow-[0_0_0_2px_rgba(255,154,82,0.35)]"
                style={{ background: "linear-gradient(145deg, #FF9A52, #E85D10)" }}
              >
                {initial}
              </span>
              <span className="hidden 2xl:block text-sm font-medium text-[#FFB27A] max-w-[120px] truncate">
                {displayName}
              </span>
              <button
                onClick={() => signOut()}
                title="ออกจากระบบ"
                aria-label="ออกจากระบบ"
                className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[#8E97A6] hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogOut size={16} strokeWidth={1.8} />
              </button>
            </div>

            {/* ออกจากระบบ (มือถือ) */}
            <button
              onClick={() => signOut()}
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
              className="sm:hidden nav-icon-btn"
            >
              <LogOut size={17} strokeWidth={1.8} />
            </button>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
              className="xl:hidden nav-icon-btn"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* เมนูมือถือ / จอเล็ก */}
      {menuOpen && (
        <div className="xl:hidden bg-[#1F252F] border-t border-white/[0.06] px-3 pb-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2 pt-3">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  style={active ? ACTIVE_STYLE : undefined}
                  className={`flex flex-col items-center gap-1 py-3 text-[13px] rounded-xl transition-colors ${
                    active ? "text-white" : "text-[#C9D0DA] bg-white/[0.05] hover:bg-white/10"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.7} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        /* ✅ ไอคอนแจ้งเตือนทุกตัวอยู่ในปุ่มวงกลมแบบกระจกจางๆ (ห่อจากภายนอก ไม่ต้องแก้ไฟล์แต่ละตัว) */
        .nav-icon,
        .nav-icon-btn {
          position: relative;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e4e8ee;
          transition: background-color 0.2s, border-color 0.2s;
        }
        .nav-icon:hover,
        .nav-icon-btn:hover {
          background: rgba(242, 107, 29, 0.18);
          border-color: rgba(255, 154, 82, 0.4);
        }
        .nav-icon > :global(a),
        .nav-icon > :global(button),
        .nav-icon > :global(div > button) {
          background: transparent !important;
          box-shadow: none !important;
          transform: none !important;
          border-radius: 9999px !important;
        }
      `}</style>
    </nav>
  );
};