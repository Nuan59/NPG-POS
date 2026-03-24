"use client";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { deleteOrder } from "@/services/OrderService";
import { IOrder } from "@/types/Order";
import { getDate } from "@/util/GetDateString";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

interface DeleteOrderDialogProps {
	order: IOrder;
	children: React.ReactNode;
}

const DeleteOrderDialog = ({ order, children }: DeleteOrderDialogProps) => {
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const handleDeleteOrder = async () => {
		setIsDeleting(true);

		try {
			const result = await deleteOrder(order.id);

			if (result) {
				toast.success(`ลบรายการขาย ${order.id} สำเร็จ`, {
					description: getDate(new Date()),
				});
				setIsOpen(false);
				router.push("/sales");
			} else {
				// ✅ แสดง error ที่ชัดเจนกว่า
				toast.error("ลบรายการขายไม่สำเร็จ", {
					description: "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ",
				});
			}
		} catch (error) {
			console.error("Delete error:", error);
			toast.error("เกิดข้อผิดพลาด", {
				description: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>ยืนยันการลบรายการขาย {order.id}?</DialogTitle>
				</DialogHeader>
				<DialogDescription>
					<div className="space-y-2">
						<h4 className="font-medium">สินค้าต่อไปนี้จะถูกคืนเข้าสต็อก:</h4>
						<ul className="mt-2 list-disc list-inside">
							{order.bikes.map((bike) => (
								<li key={bike.id}>
									{bike.model_name} ({bike.model_code})
								</li>
							))}
						</ul>
						<p className="text-red-600 font-medium mt-3">
							⚠️ การลบนี้ไม่สามารถย้อนกลับได้
						</p>
					</div>
				</DialogDescription>
				<DialogFooter className="sm:justify-between">
					<DialogClose asChild>
						<Button variant="secondary" disabled={isDeleting}>
							ยกเลิก
						</Button>
					</DialogClose>
					<Button
						onClick={handleDeleteOrder}
						className="flex items-center gap-2"
						variant={"destructive"}
						disabled={isDeleting}
					>
						{isDeleting ? (
							<>
								<span className="animate-spin">⏳</span>
								กำลังลบ...
							</>
						) : (
							<>
								<Trash2 size={"1rem"} opacity={"60%"} />
								ใช่, ลบเลย
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default DeleteOrderDialog;