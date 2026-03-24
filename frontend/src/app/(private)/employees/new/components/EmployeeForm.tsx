"use client";

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IEmployee } from "@/types/IEmployee";
import { createEmployee, editEmployee } from "@/services/EmployeeService";
import { getDate } from "@/util/GetDateString";
import { asOptionalField } from "@/util/ZodOptionalField";

/* =======================
   Validation Schema
======================= */

const EditFormSchema = z
	.object({
		name: z.string().nonempty("กรุณากรอกชื่อพนักงาน"),
		username: z.string().nonempty("กรุณากรอกชื่อผู้ใช้"),
		password: asOptionalField(z.string()),
		repeat_password: asOptionalField(z.string()),
		role: z.string(),
	})
	.refine((data) => data.password === data.repeat_password, {
		message: "รหัสผ่านไม่ตรงกัน",
		path: ["repeat_password"],
	});

const CreateFormSchema = z
	.object({
		name: z.string().nonempty("กรุณากรอกชื่อพนักงาน"),
		username: z.string().nonempty("กรุณากรอกชื่อผู้ใช้"),
		password: z.string().nonempty("กรุณากรอกรหัสผ่าน"),
		repeat_password: z.string().nonempty("กรุณายืนยันรหัสผ่าน"),
		role: z.string(),
	})
	.refine((data) => data.password === data.repeat_password, {
		message: "รหัสผ่านไม่ตรงกัน",
		path: ["repeat_password"],
	});

interface EmployeeFormProps {
	employee?: IEmployee;
}

type FormDataType = {
	name: string;
	username: string;
	password?: string;
	repeat_password?: string;
	role: "adm" | "emp";
};

const EmployeeForm = ({ employee }: EmployeeFormProps) => {
	const form = useForm<FormDataType>({
		defaultValues: {
			name: employee?.name || "",
			username: employee?.username || "",
			role: employee?.role || "emp",
			password: "",
			repeat_password: "",
		},
		resolver: zodResolver(!employee ? CreateFormSchema : EditFormSchema),
	});

	const router = useRouter();

	const onSubmit = async (values: FormDataType) => {
		const payload = { ...values };

		if (!employee) {
			const req = await createEmployee(payload);
			if (req.status === "success") {
				toast.success("เพิ่มพนักงานเรียบร้อยแล้ว", {
					description: getDate(new Date()),
				});
				router.push("/employees");
				return;
			}
			toast.error(req.data?.message || "เกิดข้อผิดพลาด");
		} else {
			const req = await editEmployee(employee.id!, payload);
			if (req.status === "success") {
				toast.success("แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว", {
					description: getDate(new Date()),
				});
				router.push(`/employees/${employee.id}`);
				return;
			}
			toast.error(req.data?.message || "เกิดข้อผิดพลาด");
		}
	};

	const employee_info = [
		{
			label: "ชื่อพนักงาน",
			name: "name",
			placeholder: "กรอกชื่อพนักงาน",
		},
		{
			label: "ชื่อผู้ใช้",
			name: "username",
			placeholder: "ใช้สำหรับเข้าสู่ระบบ",
		},
		{
			label: "รหัสผ่าน",
			name: "password",
			placeholder: "รหัสผ่าน",
		},
		{
			label: "ยืนยันรหัสผ่าน",
			name: "repeat_password",
			placeholder: "ยืนยันรหัสผ่าน",
		},
		{
			label: "ตำแหน่ง",
			name: "role",
			options: [
				{ value: "emp", label: "พนักงาน" },
				{ value: "adm", label: "ผู้ดูแลระบบ" },
			],
		},
	];

	return (
		<Form {...form}>
			<form
				id="employeeform"
				onSubmit={form.handleSubmit(onSubmit)}
				className="col-span-2 mb-5"
			>
				<div className="mt-3 h-full">
					<div className="container flex flex-col mt-3 gap-2">
						{employee_info.map((item) => (
							<FormField
								key={item.name}
								control={form.control}
								//@ts-expect-error
								name={item.name}
								render={({ field }) => (
									<FormItem className="flex items-center justify-between gap-5">
										<FormLabel>{item.label}</FormLabel>
										<FormControl className="max-w-[70%]">
											{item.options ? (
												<div className="flex flex-col w-full relative">
													<Select
														value={field.value}
														onValueChange={field.onChange}
													>
														<SelectTrigger>
															<SelectValue placeholder="เลือกตำแหน่ง" />
														</SelectTrigger>
														<SelectContent>
															{item.options.map((option) => (
																<SelectItem
																	key={option.value}
																	value={option.value}
																>
																	{option.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<FormMessage />
												</div>
											) : (
												<div className="flex flex-col w-full relative">
													<Input
														placeholder={item.placeholder}
														type={
															item.name.includes("password")
																? "password"
																: "text"
														}
														{...field}
													/>
													<FormMessage />
												</div>
											)}
										</FormControl>
									</FormItem>
								)}
							/>
						))}

						<div className="flex justify-between mt-5">
							<Button
								onClick={() => router.push("/employees")}
								variant="outline"
								type="button"
							>
								ยกเลิก
							</Button>
							<Button type="submit">บันทึก</Button>
						</div>
					</div>
				</div>
			</form>
		</Form>
	);
};

export default EmployeeForm;
