import { getOrders } from "@/services/OrderService";
import React from "react";
import SalesView from "./views/SalesView";

const Sales = async () => {
	const res = await getOrders();
	let data: any = null;
	try {
		data = await res?.json();
	} catch {
		data = null;
	}

	// ✅ กันหน้าพัง: ถ้า backend ตอบ error (เช่น 401/500) จะไม่ได้ array กลับมา
	if (!Array.isArray(data)) {
		const status = res?.status ?? "-";
		const detail =
			data?.detail || data?.error || data?.message || (data ? JSON.stringify(data) : "ไม่มีข้อมูลตอบกลับ");

		return (
			<div className="grid place-items-center h-full w-full p-6">
				<div className="max-w-xl w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm">
					<p className="font-semibold text-red-700 mb-1">โหลดรายการขายไม่สำเร็จ (status {status})</p>
					<p className="text-red-600 break-all">{String(detail).slice(0, 500)}</p>
					{status === 401 && (
						<p className="mt-2 text-slate-600">ลองออกจากระบบแล้วล็อกอินใหม่</p>
					)}
				</div>
			</div>
		);
	}

	return <SalesView orders={data} />;
};

export default Sales;