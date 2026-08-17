"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IEmployee } from "@/types/IEmployee";
import { editEmployee } from "@/services/EmployeeService";
import { PERMISSION_LIST, defaultPermissions } from "./permissions";

interface PermissionsDialogProps {
	employee: IEmployee;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved?: () => void;
}

const PermissionsDialog = ({
	employee,
	open,
	onOpenChange,
	onSaved,
}: PermissionsDialogProps) => {
	const [permissions, setPermissions] = useState<Record<string, boolean>>({
		...defaultPermissions,
		...(employee.permissions || {}),
	});
	const [isSaving, setIsSaving] = useState(false);

	const togglePermission = (key: string) => {
		setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const req = await editEmployee(employee.id!, {
				name: employee.name,
				username: employee.username,
				role: employee.role,
				permissions,
			} as any);

			if (req.status === "success") {
				toast.success(`บันทึกสิทธิ์ของ ${employee.name} เรียบร้อยแล้ว`);
				onOpenChange(false);
				onSaved?.();
			} else {
				toast.error(req.data?.message || "เกิดข้อผิดพลาด");
			}
		} catch (error) {
			console.error("Save permissions error:", error);
			toast.error("ไม่สามารถบันทึกสิทธิ์ได้");
		} finally {
			setIsSaving(false);
		}
	};

	// ✅ ผู้ดูแลระบบเข้าได้ทุกหน้าอยู่แล้ว ไม่ต้องกำหนดสิทธิ์
	if (employee.role === "adm") {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>กำหนดสิทธิ์ - {employee.name}</DialogTitle>
						<DialogDescription>
							ผู้ดูแลระบบเข้าถึงได้ทุกหน้าอยู่แล้ว ไม่ต้องกำหนดสิทธิ์เพิ่มเติม
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							ปิด
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>กำหนดสิทธิ์ - {employee.name}</DialogTitle>
					<DialogDescription>เลือกหน้าที่พนักงานคนนี้เข้าถึงได้</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-3 gap-3 py-2">
					{PERMISSION_LIST.map((perm) => (
						<label
							key={perm.key}
							className="flex items-center gap-2 cursor-pointer"
						>
							<Checkbox
								checked={!!permissions[perm.key]}
								onCheckedChange={() => togglePermission(perm.key)}
							/>
							<span className="text-sm">{perm.label}</span>
						</label>
					))}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						ยกเลิก
					</Button>
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving ? "กำลังบันทึก..." : "บันทึก"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default PermissionsDialog;