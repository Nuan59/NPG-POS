"use server";

import { authorizedFetch } from "@/util/AuthorizedFetch";

/**
 * 📊 สรุปการเงินรายเดือน
 * Response: { data: Array<{ year, month, revenue, cost, additional_fees, gross_profit, net_profit, order_count }> }
 */
export const getFinancialSummary = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/financial/summary/`,
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
 * 📊 สรุปการเงินแยกตามรุ่นรถ
 * Response: { data: Array<{ model_name, revenue, cost, gross_profit, count }> }
 */
export const getFinancialByModel = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/financial/by_model/`,
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
 * 📊 ภาพรวมการเงินทั้งหมด
 * Response: { data: { total_revenue, total_cost, total_additional_fees, gross_profit, net_profit, profit_margin, total_orders, average_profit_per_order } }
 */
export const getFinancialOverview = async () => {
	"use server";

	const response = await authorizedFetch(
		`${process.env.API_URL}/reports/financial/overview/`,
		{
			next: { revalidate: 0 },
		}
	);

	if (!response) return { 
		data: { 
			total_revenue: 0, 
			total_cost: 0, 
			total_additional_fees: 0, 
			gross_profit: 0, 
			net_profit: 0, 
			profit_margin: 0,
			total_orders: 0,
			average_profit_per_order: 0
		} 
	};
	
	const contentType = response.headers.get("content-type");
	if (!contentType || !contentType.includes("application/json")) {
		console.error("❌ API ไม่ได้ส่ง JSON กลับมา");
		return { 
			data: { 
				total_revenue: 0, 
				total_cost: 0, 
				total_additional_fees: 0, 
				gross_profit: 0, 
				net_profit: 0, 
				profit_margin: 0,
				total_orders: 0,
				average_profit_per_order: 0
			} 
		};
	}
	
	try {
		return await response.json();
	} catch (error) {
		console.error("❌ JSON parse error:", error);
		return { 
			data: { 
				total_revenue: 0, 
				total_cost: 0, 
				total_additional_fees: 0, 
				gross_profit: 0, 
				net_profit: 0, 
				profit_margin: 0,
				total_orders: 0,
				average_profit_per_order: 0
			} 
		};
	}
};