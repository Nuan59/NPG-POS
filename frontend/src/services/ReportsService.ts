"use server";

import { authorizedFetch } from "@/util/AuthorizedFetch";

/**
 * Sales volume per month (จำนวนคัน) แยกตามปี
 * Backend: GET /reports/sales/volume/
 * Response (expected): { data: Array<{ year: number|string, month: string, total_sales: number }> }
 */
export const getSalesVolumeReport = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/sales/volume/`,
		{
			next: { revalidate: 0 },
		}
	);

	if (!response) return { data: [] };
	
	// ✅ เช็คว่า response เป็น JSON จริงไหม
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		console.error("❌ API ไม่ได้ส่ง JSON กลับมา (อาจเป็น HTML error)");
		return { data: [] };
	}
	
	try {
		return await response.json();
	} catch (error) {
		console.error("❌ JSON parse error:", error);
		return { data: [] };
	}
};

/**
 * Sales payment methods usage
 * Backend: GET /reports/sales/payment_method/
 * Response (expected): { data: Array<...> }
 */
export const getSalesPaymentMethodsReport = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/sales/payment_method/`,
		{
			next: { revalidate: 0 },
		}
	);

	if (!response) return { data: [] };
	
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		console.error("❌ API ไม่ได้ส่ง JSON กลับมา");
		return { data: [] };
	}
	
	try {
		return await response.json();
	} catch (error) {
		console.error("❌ JSON parse error:", error);
		return { data: [] };
	}
};

/**
 * ✅ ยอดขายแยกตามประเภทรถ (รถใหม่ / รถมือสอง) รายเดือน
 * Backend (suggested): GET /reports/sales/vehicle_type/
 * Response (expected): { data: Array<{ year: number|string, month: string, new: number, pre_owned: number }> }
 *
 * NOTE: ถ้า backend ยังไม่มี endpoint นี้ จะได้ 404/401 ตามปกติ
 */
export const getVehicleTypeSalesReport = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/sales/vehicle_type/`,
		{
			next: { revalidate: 0 },
		}
	);

	if (!response) return { data: [] };
	
	// ✅ เช็คว่า response เป็น JSON จริงไหม
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		console.error("❌ API /reports/sales/vehicle_type/ ไม่ได้ส่ง JSON (อาจยังไม่มี endpoint นี้)");
		return { data: [] };
	}
	
	try {
		return await response.json();
	} catch (error) {
		console.error("❌ JSON parse error:", error);
		return { data: [] };
	}
};

/** Backward-compatible alias (ถ้าไฟล์อื่นเรียกชื่อเดิม) */
export const getSalesByVehicleTypeReport = getVehicleTypeSalesReport;

/**
 * ✅ สัดส่วนรถใหม่ vs รถมือสอง (รวมทั้งหมด) - สำหรับ Pie Chart
 * Backend: GET /reports/sales/vehicle_type_total/
 * Response (expected): { data: { new: number, pre_owned: number } }
 */
export const getVehicleTypeTotalReport = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/sales/vehicle_type_total/`,
		{
			next: { revalidate: 0 },
		}
	);

	if (!response) return { data: { new: 0, pre_owned: 0 } };
	
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		console.error("❌ API /reports/sales/vehicle_type_total/ ไม่ได้ส่ง JSON");
		return { data: { new: 0, pre_owned: 0 } };
	}
	
	try {
		return await response.json();
	} catch (error) {
		console.error("❌ JSON parse error:", error);
		return { data: { new: 0, pre_owned: 0 } };
	}
};

/**
 * ✅ ยอดขายแยกตามรุ่นรถ รายเดือน - สำหรับ Line Chart
 * Backend: GET /reports/sales/by_model/
 * Response (expected): { data: Array<{ year: number, month: string, model_name: string, total: number }> }
 */
export const getSalesByModelReport = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/sales/by_model/`,
		{
			next: { revalidate: 0 },
		}
	);

	if (!response) return { data: [] };
	
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		console.error("❌ API /reports/sales/by_model/ ไม่ได้ส่ง JSON");
		return { data: [] };
	}
	
	try {
		return await response.json();
	} catch (error) {
		console.error("❌ JSON parse error:", error);
		return { data: [] };
	}
};

/* =======================
   Inventory reports (ของเดิม ห้ามหาย)
======================= */
export const getInventoryBrandsReport = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/inventory/brands/`,
		{
			next: { revalidate: 0 },
		}
	);

	if (!response) return { data: [] };
	
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		console.error("❌ API ไม่ได้ส่ง JSON กลับมา");
		return { data: [] };
	}
	
	try {
		return await response.json();
	} catch (error) {
		console.error("❌ JSON parse error:", error);
		return { data: [] };
	}
};

export const getInventoryModelsReport = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/inventory/models/`,
		{
			next: { revalidate: 0 },
		}
	);

	if (!response) return { data: [] };
	
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		console.error("❌ API ไม่ได้ส่ง JSON กลับมา");
		return { data: [] };
	}
	
	try {
		return await response.json();
	} catch (error) {
		console.error("❌ JSON parse error:", error);
		return { data: [] };
	}
};

export const getInventoryStoragesReport = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/inventory/storages/`,
		{
			next: { revalidate: 0 },
		}
	);

	if (!response) return { data: [] };
	
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		console.error("❌ API ไม่ได้ส่ง JSON กลับมา");
		return { data: [] };
	}
	
	try {
		return await response.json();
	} catch (error) {
		console.error("❌ JSON parse error:", error);
		return { data: [] };
	}
};