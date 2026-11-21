// จับคู่ path -> permission key
// ⚠️ key ต้องตรงกับที่ประกาศใน employees/components/permissions.ts เป๊ะๆ
export const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/sales": "sale",
  "/customers": "customer",
  "/inventory": "inventory",
  "/storage": "storage",
  "/gifts": "gifts",
  "/parts": "parts",
  "/registration": "registration",
  "/installment": "calculator",
  "/npg": "npg",
  "/cashflow": "cashflow",
  "/issues": "board",
  "/employees": "employees",
  "/reports": "reports",
  // ✅ ใบเสร็จ & ประวัติรถ - ติ๊กได้ในหน้าพนักงาน (ยังไม่เคยติ๊ก = เปิดให้คนที่ ขาย / NPG / รายงาน ดู withPermissionDefaults)
  "/service-history": "service_history",
};

/**
 * หา permission key ที่ path นี้ต้องการ
 * คืนค่า null ถ้าเป็นหน้าที่เข้าได้เสมอ (เช่น /dashboard)
 * รองรับ sub-path ด้วย เช่น /sales/123/edit ก็นับเป็น /sales
 */
export const getRequiredPermission = (pathname: string): string | null => {
  const match = Object.keys(ROUTE_PERMISSION_MAP).find(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
  return match ? ROUTE_PERMISSION_MAP[match] : null;
};