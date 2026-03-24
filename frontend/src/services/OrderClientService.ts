import { IOrder } from "@/types/Order";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * CLIENT ONLY
 * ต้องให้ URL ตรงกับ backend: /order/{id}/
 */
export const getOrderClient = async (
	orderId: number | string,
	token: string
): Promise<IOrder> => {
	if (!token) throw new Error("ไม่พบ access token");

	// ✅ endpoint ให้ตรงกับ server OrderService.ts
	const url = `${API_BASE_URL}/order/${orderId}/`;

	const res = await fetch(url, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		console.error("getOrderClient error:", res.status, text, "URL:", url);
		throw new Error(`โหลดออเดอร์ไม่สำเร็จ (${res.status})`);
	}

	return res.json();
};
