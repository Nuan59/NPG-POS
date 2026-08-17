// รายการสิทธิ์การเข้าถึงหน้าต่างๆ ของพนักงาน (role = "emp" เท่านั้น)
// ใช้ร่วมกันระหว่าง EmployeeForm.tsx (ฟอร์มเต็มหน้า) และ PermissionsDialog.tsx (dialog ด่วน)
// ⚠️ แก้ที่นี่ที่เดียว ไม่ต้องไปแก้ซ้ำที่อื่น

export interface PermissionItem {
	key: string;
	label: string;
}

export const PERMISSION_LIST: PermissionItem[] = [
	{ key: "sale",         label: "ขาย" },
	{ key: "customer",     label: "ลูกค้า" },
	{ key: "inventory",    label: "สินค้า" },
	{ key: "storage",      label: "คลัง" },
	{ key: "gifts",        label: "ของแถม" },
	{ key: "registration", label: "ทะเบียน" },
	{ key: "calculator",   label: "คำนวณ" },
	{ key: "npg",          label: "NPG" },
	{ key: "cashflow",     label: "รายรับ-รายจ่าย" },
	{ key: "board",        label: "กระทู้" },
	{ key: "employees",    label: "พนักงาน" },
	{ key: "reports",      label: "รายงาน" },
];

export const defaultPermissions: Record<string, boolean> = PERMISSION_LIST.reduce(
	(acc, perm) => ({ ...acc, [perm.key]: false }),
	{} as Record<string, boolean>
);