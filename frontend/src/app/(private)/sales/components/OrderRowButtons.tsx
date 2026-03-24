"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Eye,
	MoreHorizontal,
	Pencil,
	Receipt,
	Truck,
	Trash2,
	XCircle,
	FileText,
} from "lucide-react";
import Link from "next/link";
import { IOrder } from "@/types/Order";
import { getSession, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type DeleteMode = "cancel" | "delete" | null;

const OrderRowButtons = ({ order }: { order: IOrder }) => {
	const router = useRouter();
	const { data: session } = useSession();
	const userInfo = session?.user as any;

	const roleCode = String(userInfo?.role ?? "").toLowerCase();
	const isManager = roleCode === "adm";

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [deleteMode, setDeleteMode] = useState<DeleteMode>(null);

	const handleDelete = async (mode: DeleteMode) => {
		if (!mode) return;
		
		setIsDeleting(true);

		try {
			const s = await getSession();
			const token = (s as any)?.user?.accessToken;

			if (!token) {
				toast.error("ไม่พบ Token", {
					description: "กรุณาเข้าสู่ระบบใหม่"
				});
				setShowDeleteDialog(false);
				setIsDeleting(false);
				router.push("/login");
				return;
			}

			// ✅ ส่งพารามิเตอร์ restore_stock ตาม mode
			const shouldRestoreStock = mode === "cancel"; // ยกเลิกการขาย = คืนสินค้า
			const url = `${API_BASE_URL}/order/${order.id}/?restore_stock=${shouldRestoreStock}`;

			const res = await fetch(url, {
				method: "DELETE",
				headers: { 
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json"
				},
			});

			if (res.status === 401) {
				toast.error("Session หมดอายุ", {
					description: "กรุณาเข้าสู่ระบบใหม่"
				});
				setShowDeleteDialog(false);
				setIsDeleting(false);
				router.push("/login");
				return;
			}

			if (res.status === 403) {
				toast.error("ไม่มีสิทธิ์", {
					description: "เฉพาะผู้จัดการเท่านั้นที่สามารถทำได้"
				});
				setShowDeleteDialog(false);
				setIsDeleting(false);
				return;
			}

			if (!res.ok) {
				let errorMessage = "ไม่ทราบสาเหตุ";
				
				try {
					const errorData = await res.json();
					errorMessage = errorData.message || errorData.detail || errorMessage;
				} catch (parseError) {
					console.error("Cannot parse error response:", parseError);
				}
				
				toast.error(`${mode === "cancel" ? "ยกเลิก" : "ลบ"}ไม่สำเร็จ (${res.status})`, {
					description: errorMessage
				});
				setShowDeleteDialog(false);
				setIsDeleting(false);
				return;
			}

			// ✅ สำเร็จ
			const actionText = mode === "cancel" ? "ยกเลิกการขาย" : "ลบรายการขาย";
			const stockText = mode === "cancel" ? " และคืนสินค้าเข้าสต็อก" : "";
			
			toast.success(`${actionText}สำเร็จ`, {
				description: `รายการ ${order.id} ถูก${mode === "cancel" ? "ยกเลิก" : "ลบ"}แล้ว${stockText}`
			});
			
			setShowDeleteDialog(false);
			setIsDeleting(false);
			setDeleteMode(null);
			
			// ✅ Force refresh หน้า
			router.refresh();

		} catch (error) {
			console.error("Delete error:", error);
			
			const errorMessage = error instanceof Error 
				? error.message 
				: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้";
			
			toast.error("เกิดข้อผิดพลาด", {
				description: errorMessage
			});
			
			setShowDeleteDialog(false);
			setIsDeleting(false);
			setDeleteMode(null);
		}
	};

	const handleDialogClose = (open: boolean) => {
		if (isDeleting) return;
		setShowDeleteDialog(open);
		if (!open) {
			setDeleteMode(null);
		}
	};

	const handleOpenDeleteDialog = (mode: DeleteMode) => {
		setDeleteMode(mode);
		setDropdownOpen(false);
		setTimeout(() => {
			setShowDeleteDialog(true);
		}, 100);
	};

	// ✅ ข้อความที่แตกต่างกันตาม mode
	const getDialogContent = () => {
		if (deleteMode === "cancel") {
			return {
				title: "ยกเลิกการขาย?",
				description: "การยกเลิกการขายจะ:",
				actions: [
					"ลบรายการขายออกจากระบบ",
					"คืนสินค้ากลับเข้าสต็อก (สินค้าจะกลับมาขายได้)",
				],
				buttonText: "ยกเลิกการขาย",
				icon: <XCircle className="h-4 w-4" />,
			};
		} else {
			return {
				title: "ลบรายการขาย?",
				description: "การลบรายการจะ:",
				actions: [
					"ลบรายการขายออกจากระบบอย่างถาวร",
					"ไม่คืนสินค้ากลับเข้าสต็อก (เหมาะสำหรับสินค้าที่เสียหาย/สูญหาย)",
				],
				buttonText: "ลบรายการ",
				icon: <Trash2 className="h-4 w-4" />,
			};
		}
	};

	const dialogContent = getDialogContent();

	return (
		<>
			<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="h-8 w-8 p-0">
						<span className="sr-only">Open menu</span>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end">
					<Link href={`/sales/${order.id}`}>
						<DropdownMenuItem className="flex justify-between gap-2">
							<Eye className="opacity-60 h-4 w-4" />
							ดู
						</DropdownMenuItem>
					</Link>

					{isManager && (
						<Link href={`/sales/${order.id}/edit`}>
							<DropdownMenuItem className="flex justify-between gap-2">
								<Pencil className="opacity-60 h-4 w-4" />
								แก้ไข
							</DropdownMenuItem>
						</Link>
					)}

					<Link href={`/sales/${order.id}/receipt`}>
						<DropdownMenuItem className="flex justify-between gap-2">
							<Receipt className="opacity-60 h-4 w-4" />
							ใบเสร็จรับเงิน
						</DropdownMenuItem>
					</Link>
					
					<Link href={`/sales/${order.id}/delivery-note`}>
						<DropdownMenuItem className="flex justify-between gap-2">
							<Truck className="opacity-60 h-4 w-4" />
							ใบส่งมอบ
						</DropdownMenuItem>
					</Link>

					{/* ✅ เพิ่มปุ่ม PDI */}
					<Link href={`/sales/${order.id}/pdi`}>
						<DropdownMenuItem className="flex justify-between gap-2">
							<FileText className="opacity-60 h-4 w-4" />
							ใบ PDI
						</DropdownMenuItem>
					</Link>

					{isManager && (
						<>
							<DropdownMenuSeparator />
							
							{/* ยกเลิกการขาย = คืนสินค้า */}
							<DropdownMenuItem
								onClick={() => handleOpenDeleteDialog("cancel")}
								className="flex justify-between gap-2 text-orange-600 focus:text-orange-600"
							>
								<XCircle className="opacity-60 h-4 w-4" />
								ยกเลิกการขาย
							</DropdownMenuItem>

							{/* ลบการขาย = ไม่คืนสินค้า */}
							<DropdownMenuItem
								onClick={() => handleOpenDeleteDialog("delete")}
								className="flex justify-between gap-2 text-red-600 focus:text-red-600"
							>
								<Trash2 className="opacity-60 h-4 w-4" />
								ลบรายการขาย
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog open={showDeleteDialog} onOpenChange={handleDialogClose}>
				<DialogContent 
					className="z-[100]"
					onPointerDownOutside={(e) => {
						if (isDeleting) e.preventDefault();
					}}
					onEscapeKeyDown={(e) => {
						if (isDeleting) e.preventDefault();
					}}
					onInteractOutside={(e) => {
						if (isDeleting) e.preventDefault();
					}}
				>
					<DialogHeader>
						<DialogTitle>{dialogContent.title}</DialogTitle>
						<DialogDescription>
							<div className="space-y-3">
								<div>
									<strong>รายการ #{order.id}</strong> - ลูกค้า: {order.customer}
								</div>

								{order.bikes && order.bikes.length > 0 && (
									<div>
										<div className="font-medium">สินค้า:</div>
										<ul className="list-disc list-inside mt-1 text-sm">
											{order.bikes.map((bike) => (
												<li key={bike.id}>
													{bike.model_name} ({bike.model_code})
												</li>
											))}
										</ul>
									</div>
								)}

								<div className="bg-slate-100 p-3 rounded">
									<div className="font-medium mb-2">{dialogContent.description}</div>
									<ul className="list-disc list-inside text-sm space-y-1">
										{dialogContent.actions.map((action, index) => (
											<li key={index}>{action}</li>
										))}
									</ul>
								</div>

								<div className="text-red-600 font-medium">
									⚠️ การดำเนินการนี้ไม่สามารถย้อนกลับได้
								</div>
							</div>
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="secondary"
							onClick={() => handleDialogClose(false)}
							disabled={isDeleting}
						>
							ยกเลิก
						</Button>
						<Button
							onClick={() => handleDelete(deleteMode)}
							disabled={isDeleting}
							variant="destructive"
							className="gap-2"
						>
							{isDeleting ? (
								<>
									<span className="animate-spin">⏳</span>
									กำลังดำเนินการ...
								</>
							) : (
								<>
									{dialogContent.icon}
									{dialogContent.buttonText}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default OrderRowButtons;