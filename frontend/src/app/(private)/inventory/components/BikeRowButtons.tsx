"use client";

import React, { useContext, useEffect, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Eye,
	MoreHorizontal,
	Pencil,
	ShoppingCart,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { OrderContext } from "@/context/OrderContext";
import { Button } from "@/components/ui/button";
import { IBike } from "@/types/Bike";
import { getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ✅ role จริงในระบบคุณ: adm = ผู้จัดการ, emp = พนักงาน
const ADMIN_ROLE_CODE = "adm";

const BikeRowButtons = ({ bike }: { bike: IBike }) => {
	const { addBikeToOrder } = useContext(OrderContext);
	const router = useRouter();

	const [roleCode, setRoleCode] = useState<string | null>(null);
	const [roleLoaded, setRoleLoaded] = useState(false);

	useEffect(() => {
		let alive = true;

		(async () => {
			const session = await getSession();

			// พยายามอ่าน role จากหลายตำแหน่ง (กันโครงสร้าง session ต่างกัน)
			const rawRole =
				(session as any)?.user?.role ??
				(session as any)?.user?.role_code ??
				(session as any)?.user?.user?.role ??
				(session as any)?.role ??
				null;

			if (!alive) return;

			setRoleCode(rawRole ? String(rawRole).trim().toLowerCase() : null);
			setRoleLoaded(true);

			// ถ้าจะ debug ชั่วคราว เปิดบรรทัดนี้ได้
			// console.log("SESSION.USER =", (session as any)?.user, "roleCode =", rawRole);
		})();

		return () => {
			alive = false;
		};
	}, []);

	const isManager = roleCode === ADMIN_ROLE_CODE;

	const handleDelete = async () => {
		const ok = window.confirm("ต้องการลบสินค้านี้ใช่ไหม?\n(ลบแล้วกู้คืนไม่ได้)");
		if (!ok) return;

		try {
			const session = await getSession();
			const token = (session as any)?.user?.accessToken;

			if (!token) {
				alert("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");
				router.push("/login");
				return;
			}

			const res = await fetch(`${API_BASE_URL}/inventory/${bike.id}/`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (res.status === 401) {
				alert("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
				router.push("/login");
				return;
			}

			if (res.status === 403) {
				alert("คุณไม่มีสิทธิ์ลบ (ผู้จัดการเท่านั้น)");
				return;
			}

			if (!res.ok) {
				const text = await res.text().catch(() => "");
				console.error("Delete failed:", res.status, text);
				alert(`ลบไม่สำเร็จ (${res.status})`);
				return;
			}

			// ✅ ลบสำเร็จ -> รีเฟรชตาราง
			router.refresh();
		} catch (e) {
			console.error(e);
			alert("ลบไม่สำเร็จ (เกิดข้อผิดพลาด)");
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-8 w-8 p-0">
					<span className="sr-only">Open menu</span>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end">
				{/* ✅ ดูสินค้า */}
				<Link href={`/inventory/${bike.id}`}>
					<DropdownMenuItem className="flex justify-between">
						<Eye className="opacity-60" />
						ดู
					</DropdownMenuItem>
				</Link>

				{/* ✅ แก้ไข */}
				<Link href={`/inventory/${bike.id}/edit`}>
					<DropdownMenuItem className="flex justify-between">
						<Pencil className="opacity-60" />
						แก้ไข
					</DropdownMenuItem>
				</Link>

				{/* ✅ เพิ่มเข้าออเดอร์ */}
				{!bike.sold && (
					<DropdownMenuItem
						onClick={() => addBikeToOrder(bike)}
						className="flex justify-between"
					>
						<ShoppingCart className="opacity-60" />
						เพิ่ม
					</DropdownMenuItem>
				)}

				{/* ✅ ลบสินค้า: แสดงเฉพาะผู้จัดการ (adm) */}
				{roleLoaded && isManager && (
					<DropdownMenuItem
						onClick={handleDelete}
						className="flex justify-between text-red-600 focus:text-red-600"
					>
						<Trash2 className="opacity-60" />
						ลบ
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default BikeRowButtons;
