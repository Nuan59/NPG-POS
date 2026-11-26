// รายการสิทธิ์การเข้าถึงหน้าต่างๆ ของพนักงาน (role = "emp" เท่านั้น)
// ใช้ร่วมกันระหว่าง EmployeeForm.tsx (ฟอร์มเต็มหน้า) และ PermissionsDialog.tsx (dialog ด่วน)
// ⚠️ แก้ที่นี่ที่เดียว ไม่ต้องไปแก้ซ้ำที่อื่น

export interface PermissionItem {
	key: string;
	label: string;
	/** "action" = สิทธิ์ทำรายการ (ไม่ใช่เมนู) - แสดงแยกกลุ่มในหน้ากำหนดสิทธิ์ */
	group?: "menu" | "action";
}

export const PERMISSION_LIST: PermissionItem[] = [
	{ key: "sale",         label: "ขาย" },
	{ key: "customer",     label: "ลูกค้า" },
	{ key: "inventory",    label: "สินค้า" },
	{ key: "storage",      label: "คลัง" },
	{ key: "gifts",        label: "ของแถม" },
	{ key: "parts",        label: "อะไหล่" },
	{ key: "service_history", label: "ใบเสร็จ & ประวัติรถ" },
	{ key: "registration", label: "ทะเบียน" },
	{ key: "calculator",   label: "คำนวณ" },
	{ key: "npg",          label: "NPG" },
	{ key: "cashflow",     label: "รายรับ-รายจ่าย" },
	{ key: "board",        label: "กระทู้" },
	{ key: "employees",    label: "พนักงาน" },
	{ key: "reports",      label: "รายงาน" },
	// ✅ สิทธิ์ทำรายการ (เอกสารภาษี) - adm ติ๊กเปิด/ปิดรายคน
	{ key: "tax_invoice",  label: "ออกใบกำกับภาษี (ขาย)", group: "action" },
	{ key: "input_tax",    label: "บันทึกใบกำกับภาษีซื้อ", group: "action" },
];

export const MENU_PERMISSIONS = PERMISSION_LIST.filter((p) => p.group !== "action");
export const ACTION_PERMISSIONS = PERMISSION_LIST.filter((p) => p.group === "action");

/**
 * ✅ เมนูที่เพิ่มทีหลัง - พนักงานเก่ายังไม่เคยมีค่านี้ (ไม่ใช่ "ปิด") → ใช้ค่าตั้งต้นตามงานที่ทำอยู่แล้ว
 * adm ติ๊กออก/ติ๊กใส่ในหน้าแก้ไขพนักงานเมื่อไหร่ ใช้ค่าที่ติ๊กแทนทันที
 *   อะไหล่              ← คนที่ขายได้ (ขายอะไหล่ / ใช้อะไหล่ในงานซ่อม)
 *   ใบเสร็จ & ประวัติรถ ← คนที่รับเงินลูกค้า (ขาย / NPG) หรือดูรายงาน (สิทธิ์เดิมของประวัติรถ)
 *   ออกใบกำกับภาษี      ← คนที่ขายได้
 */
const FALLBACK: Record<string, (p: Record<string, boolean>) => boolean> = {
	parts: (p) => !!p.sale,
	service_history: (p) => !!(p.sale || p.npg || p.reports),
	tax_invoice: (p) => !!p.sale, // ✅ ออกใบกำกับภาษี ← คนที่ขายได้ (ตรงกับ backend can_issue)
	input_tax: () => true,         // ✅ บันทึกใบกำกับภาษีซื้อ ← พนักงานทุกคน (ตรงกับ backend can_input)
};

export const withPermissionDefaults = (p?: Record<string, boolean> | null): Record<string, boolean> => {
	const src = p || {};
	const out: Record<string, boolean> = { ...src };
	for (const [key, fn] of Object.entries(FALLBACK)) {
		if (typeof src[key] !== "boolean") out[key] = fn(src);
	}
	return out;
};

export const defaultPermissions: Record<string, boolean> = PERMISSION_LIST.reduce(
	(acc, perm) => ({ ...acc, [perm.key]: false }),
	{} as Record<string, boolean>
);