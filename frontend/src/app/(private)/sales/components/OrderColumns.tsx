"use client";

import { ColumnDef } from "@tanstack/react-table";
import { IOrder } from "@/types/Order";
import { getDate } from "@/util/GetDateString";
import OrderRowButtons from "./OrderRowButtons";

export const OrderColumns: ColumnDef<IOrder>[] = [
	{
		accessorKey: "sale_date",
		header: "วันที่",
		cell: ({ row }) => {
			const order = row.original;
			const date = getDate(order.sale_date);
			return <div>{date}</div>;
		},
	},
	{
		// ✅ สถานะ: รอจบ (ยังไม่ตัดขาย) / เช็คลิสต์ไม่ครบ - ออเดอร์ปกติไม่มีป้าย
		id: "status",
		header: "สถานะ",
		cell: ({ row }) => {
			const o = row.original;
			const pending = o.sale_status === "pending";
			// รอจบ = ยังเช็คได้อยู่ โชว์แค่ป้าย "รอจบ" / จบแล้วแต่เช็คไม่ครบ = ป้าย "เช็คไม่ครบ"
			const missing = pending ? 0 : o.checklist_missing ?? 0;
			if (!pending && missing <= 0) return null;
			return (
				<div className="flex flex-wrap gap-1">
					{pending && (
						<span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F26B1D] text-white whitespace-nowrap">
							รอจบ
						</span>
					)}
					{missing > 0 && (
						<span
							title={o.notes?.split("\n").find((l) => l.startsWith("เช็คลิสต์ขาด:")) || ""}
							className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap"
						>
							เช็คไม่ครบ {missing}
						</span>
					)}
				</div>
			);
		},
	},
	{
		header: "ชื่อลูกค้า",
		cell: ({ row }) => {
			const order = row.original;
			return <div>{order.customer}</div>;
		},
	},
	{
		header: "ชื่อรุ่น",
		cell: ({ row }) => {
			const order = row.original;
			const bike = order.bikes?.[0];
			return <div>{bike?.model_name || "ไม่ระบุ"}</div>;
		},
	},

	{
		accessorKey: "payment_method",
		header: "วิธีการชำระเงิน",
		cell: ({ row }) => {
			const method = row.original.payment_method;

			// ✅ สีตามโลโก้แต่ละบริษัท
			const colorClass = 
				method === "เงินสด" ? "bg-yellow-50 text-black" :
				method === "Cathay" ? "bg-green-100 text-green-800" :
				method === "ทรัพย์สยาม" ? "bg-blue-100 text-blue-800" :
				method === "NPG" ? "bg-orange-500 text-white" :
				method === "Summit" ? "bg-purple-100 text-purple-800" :
				method === "S Leasing" ? "bg-cyan-100 text-cyan-800" :
				method === "CIMB" ? "bg-red-100 text-red-800" :
				method === "World Lease" ? "bg-indigo-100 text-indigo-800" :
				method === "เงินติดล้อ" ? "bg-lime-100 text-lime-800" :
				"bg-gray-100 text-gray-800";

			return (
				<span className={`px-2 py-1 rounded text-xs font-semibold ${colorClass}`}>
					{method ?? "-"}
				</span>
			);
		},
	},

	{
		id: "actions",
		cell: ({ row }) => {
			const order = row.original;
			return <OrderRowButtons order={order} />;
		},
	},
];