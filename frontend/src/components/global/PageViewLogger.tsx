"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getSession } from "next-auth/react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ✅ ชื่อหน้าภาษาไทยในบันทึกการทำงาน (ตัวที่ยาวกว่าต้องอยู่ก่อน)
const TITLES: [string, string][] = [
  ["/employees/activity", "บันทึกการทำงาน"],
  ["/sales", "ขาย"], ["/customers", "ลูกค้า"], ["/inventory", "สินค้า"], ["/storage", "คลัง"],
  ["/gifts", "ของแถม"], ["/parts", "อะไหล่"], ["/registration", "ทะเบียน"], ["/service-history", "ประวัติรถ"],
  ["/installment", "คำนวณ"], ["/npg", "NPG"], ["/cashflow", "รายรับ-รายจ่าย"], ["/issues", "กระทู้"],
  ["/employees", "พนักงาน"], ["/reports", "รายงาน"], ["/tasks", "งานของฉัน"], ["/manual", "คู่มือ"],
  ["/dashboard", "หน้าหลัก"],
];

const titleFor = (path: string) => {
  const hit = TITLES.find(([p]) => path === p || path.startsWith(p + "/"));
  if (!hit) return "";
  const rest = path.slice(hit[0].length).replace(/^\//, "");
  if (!rest) return hit[1];
  const id = rest.match(/^(\d+)/)?.[1];
  const sub = rest.replace(/^\d+\/?/, "");
  const SUB: Record<string, string> = {
    edit: "แก้ไข", documents: "เอกสาร", receipt: "ใบเสร็จ", pdi: "ใบ PDI", "delivery-note": "ใบส่งมอบ",
    new: "เพิ่มใหม่", add: "เพิ่ม", import: "นำเข้า", transfer: "โอน", history: "ประวัติ",
  };
  return [hit[1], id && `#${id}`, sub && (SUB[sub.split("/")[0]] ?? sub)].filter(Boolean).join(" ");
};

/**
 * ✅ บันทึกการเปิดหน้า (ใครเปิดดูหน้าไหน เมื่อไหร่) → หน้า พนักงาน → บันทึกการทำงาน
 * ส่งครั้งเดียวต่อการเปลี่ยนหน้า / หน้าเดิมซ้ำภายใน 1 นาทีไม่ส่ง / ส่งไม่สำเร็จก็ไม่กระทบการใช้งาน
 */
export default function PageViewLogger() {
  const pathname = usePathname() || "";
  const last = useRef<{ path: string; at: number }>({ path: "", at: 0 });

  useEffect(() => {
    if (!pathname || pathname === "/login") return;
    const now = Date.now();
    if (last.current.path === pathname && now - last.current.at < 60_000) return;
    last.current = { path: pathname, at: now };
    const t = setTimeout(async () => {
      try {
        const session = await getSession();
        const token = (session as any)?.user?.accessToken;
        if (!token) return;
        await fetch(`${API}/activity-logs/view/`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname + window.location.search, title: titleFor(pathname) }),
          keepalive: true,
        });
      } catch {
        /* ไม่กระทบการใช้งาน */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
