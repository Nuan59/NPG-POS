"use client";
import { Button } from "@/components/ui/button";
import { IOrder } from "@/types/Order";
import { Trash2, Pencil, Receipt, FileText } from "lucide-react";
import Link from "next/link";
import React from "react";
import DeleteOrderDialog from "./DeleteOrderDialog";
import { useSession } from "next-auth/react";

interface ActionButtonsProps {
	order: IOrder;
}

const ActionButtons = ({ order }: ActionButtonsProps) => {
	const { data: session } = useSession();
	const userInfo = session?.user;

	return (
		<div className="w-full flex justify-between">
			<DeleteOrderDialog order={order}>
				<Button className="flex items-center gap-2" variant={"destructive"}>
					<Trash2 size={"1rem"} opacity={"60%"} />
					ลบ
				</Button>
			</DeleteOrderDialog>

			<div className="flex gap-1">
				{userInfo?.role === "adm" && (
					<Link href={`/sales/${order.id}/edit`}>
						<Button variant={"outline"} className="flex items-center gap-2">
							<Pencil size={"1rem"} opacity={"60%"} />
							แก้ไข
						</Button>
					</Link>
				)}
				<Link href={`/sales/${order.id}/receipt`}>
					<Button className="flex items-center gap-2">
						<Receipt size={"1rem"} opacity={"60%"} />
						ใบเสร็จ
					</Button>
				</Link>
				{/* ✅ เพิ่มปุ่ม PDI */}
				<Link href={`/sales/${order.id}/pdi`}>
					<Button variant={"outline"} className="flex items-center gap-2">
						<FileText size={"1rem"} opacity={"60%"} />
						ใบ PDI
					</Button>
				</Link>
			</div>
		</div>
	);
};

export default ActionButtons;