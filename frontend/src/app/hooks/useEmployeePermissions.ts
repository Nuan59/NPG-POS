"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://backend-service-production-1fc3.up.railway.app";

/**
 * ดึงสิทธิ์การเข้าถึงหน้าต่างๆ ของ user ที่ login อยู่จริง
 * - role "adm" ผ่านทุกหน้าเสมอ ไม่ต้องยิง API
 * - role "mon" (ผู้ตรวจสอบ) เห็นได้ทุกหน้าเหมือน adm (การกันแก้ไขอยู่ที่ backend)
 * - role "emp" ดึง permissions จาก /employees/{id}/ (ข้อมูลเดียวกับที่หน้าแก้ไขพนักงานใช้)
 */
export const useEmployeePermissions = () => {
  const { data: session, status } = useSession();
  const userInfo = session?.user as any;
  const isAdmin = userInfo?.role === "adm";
  const isMonitor = userInfo?.role === "mon";
  const seesAll = isAdmin || isMonitor;

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    // ✅ ผู้ดูแลระบบเข้าได้ทุกหน้าอยู่แล้ว ไม่ต้องเช็ค permissions
    if (seesAll) {
      setLoaded(true);
      return;
    }

    if (!userInfo?.id || !userInfo?.accessToken) {
      setLoaded(true);
      return;
    }

    fetch(`${API_URL}/employees/${userInfo.id}/`, {
      headers: { Authorization: `Bearer ${userInfo.accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setPermissions(data?.permissions || {});
      })
      .catch(() => {
        setPermissions({});
      })
      .finally(() => setLoaded(true));
  }, [status, seesAll, userInfo?.id, userInfo?.accessToken]);

  /**
   * เช็คว่าเข้าหน้าที่ต้องการ permission นี้ได้ไหม
   * key = null หมายถึงหน้าที่เข้าได้เสมอ (เช่นหน้าหลัก)
   */
  const canAccess = (key: string | null) => {
    if (!key) return true;
    if (seesAll) return true;
    return !!permissions[key];
  };

  return { isAdmin, isMonitor, permissions, loaded, canAccess };
};