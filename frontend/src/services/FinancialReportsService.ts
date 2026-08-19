"use server";

import { authorizedFetch } from "@/util/AuthorizedFetch";

const EMPTY_OVERVIEW = {
	total_revenue: 0,
	total_additional_fee_revenue: 0,
	total_cost: 0,
	total_additional_fees: 0,
	gross_profit: 0,
	net_profit: 0,
	profit_margin: 0,
	total_orders: 0,
	average_profit_per_order: 0,
};

/**
 * ✅ อ่าน response แบบปลอดภัย
 * - เช็ค response.ok ก่อนเสมอ (เดิมไม่เช็ค ทำให้ error response ที่เป็น JSON เช่น
 *   {"detail":"Authentication credentials were not provided."} ถูกอ่านเป็นข้อมูลปกติ
 *   แล้ว .data เป็น undefined -> หน้าเว็บ fallback เป็น 0 เงียบๆ โดยไม่มี error โชว์เลย)
 * - log ให้เห็นสถานะจริงใน Vercel function logs
 * - คืน field `error` กลับไปด้วย เพื่อให้หน้าเว็บโชว์ error ตรงๆได้ ไม่ต้องเดา
 */
async function safeReadJson(response: Response | null, label: string) {
	if (!response) {
		console.error(`❌ [${label}] authorizedFetch คืนค่า null (ไม่มี session/token)`);
		return { data: undefined, error: "ไม่มี session หรือ token กรุณา login ใหม่" };
	}

	const contentType = response.headers.get("content-type") || "";
	const isJson = contentType.includes("application/json");

	if (!response.ok) {
		const bodyText = isJson
			? JSON.stringify(await response.json().catch(() => null))
			: await response.text().catch(() => "");
		console.error(`❌ [${label}] HTTP ${response.status} ${response.statusText}:`, bodyText);
		return {
			data: undefined,
			error: `HTTP ${response.status}: ${bodyText || response.statusText}`,
		};
	}

	if (!isJson) {
		const bodyText = await response.text().catch(() => "");
		console.error(`❌ [${label}] API ไม่ได้ส่ง JSON กลับมา:`, bodyText.slice(0, 300));
		return { data: undefined, error: "API ไม่ได้ส่ง JSON กลับมา (อาจเป็นหน้า error HTML)" };
	}

	try {
		const json = await response.json();
		return { data: json?.data, error: undefined };
	} catch (error) {
		console.error(`❌ [${label}] JSON parse error:`, error);
		return { data: undefined, error: "JSON parse error" };
	}
}

/**
 * 📊 สรุปการเงินรายเดือน
 * Response: { data: Array<{ year, month, revenue, cost, additional_fees, gross_profit, net_profit, order_count }>, error?: string }
 */
export const getFinancialSummary = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/financial/summary/`,
		{
			next: { revalidate: 0 },
		}
	);

	const { data, error } = await safeReadJson(response, "financial/summary");
	return { data: data ?? [], error };
};

/**
 * 📊 สรุปการเงินแยกตามรุ่นรถ
 * ✅ รองรับกรองตามปี/เดือนที่เลือกในหน้าจอ
 * @param year  ปี ค.ศ. เช่น "2026" (ไม่ส่ง หรือส่ง "all" = ทุกปี)
 * @param month ชื่อเดือนไทย เช่น "มกราคม" (ไม่ส่ง หรือส่ง "all" = ทุกเดือน)
 * Response: { data: Array<{ model_name, revenue, cost, gross_profit, count }>, error?: string }
 */
export const getFinancialByModel = async (year?: string, month?: string) => {
	"use server";

	const params = new URLSearchParams();
	if (year && year !== "all") params.set("year", year);
	if (month && month !== "all") params.set("month", month);
	const queryString = params.toString();

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/financial/by_model/${queryString ? `?${queryString}` : ""}`,
		{
			next: { revalidate: 0 },
		}
	);

	const { data, error } = await safeReadJson(response, "financial/by_model");
	return { data: data ?? [], error };
};

/**
 * 📊 ภาพรวมการเงินทั้งหมด
 * Response: { data: { total_revenue, total_cost, total_additional_fees, gross_profit, net_profit, profit_margin, total_orders, average_profit_per_order }, error?: string }
 */
export const getFinancialOverview = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/financial/overview/`,
		{
			next: { revalidate: 0 },
		}
	);

	const { data, error } = await safeReadJson(response, "financial/overview");
	return { data: data ?? EMPTY_OVERVIEW, error };
};