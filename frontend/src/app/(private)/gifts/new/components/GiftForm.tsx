"use client";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createGift } from "@/services/GiftService";
import { getDate } from "@/util/GetDateString";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createGiftFormSchema = z.object({
	name: z.string().nonempty("กรุณากรอกชื่อของแถม"),
	price: z.coerce.number().min(0, "ราคาต้องมากกว่าหรือเท่ากับ 0"),
	stock: z.coerce.number().min(0, "จำนวนต้องมากกว่าหรือเท่ากับ 0"),
	wholesale_price: z.coerce.number().min(0, "ราคาต้องมากกว่าหรือเท่ากับ 0").optional().or(z.literal("")),
});

type FormDataType = z.infer<typeof createGiftFormSchema>;

const GiftForm = () => {
	const form = useForm<FormDataType>({
		defaultValues: {
			name: "",
			price: 0,
			stock: 0,
			wholesale_price: undefined,
		},
		resolver: zodResolver(createGiftFormSchema),
	});

	const router = useRouter();

	const gift_info = [
		{
			label: "ชื่อของแถม",
			name: "name",
			placeholder: "กรอกชื่อของแถม",
		},
		{
			label: "ราคา",
			name: "price",
			placeholder: "กรอกราคา",
		},
		{
			label: "ขายส่ง",
			name: "wholesale_price",
			placeholder: "กรอกราคาขายส่ง",
		},
		{
			label: "จำนวนในคลัง",
			name: "stock",
			placeholder: "กรอกจำนวน",
		},
	];

	const onSubmit = async (values: FormDataType) => {
		const req = await createGift(values);

		if (req.status === "success") {
			toast.success(`เพิ่มของแถม ${values.name} เรียบร้อยแล้ว`, {
				description: getDate(new Date()),
			});
			router.push("/gifts");
			return;
		}

		const error = await req.data;
		toast.error(error.message || "เกิดข้อผิดพลาด");
	};

	return (
		<Form {...form}>
			<form
				id="giftform"
				onSubmit={form.handleSubmit(onSubmit)}
				className="mt-5"
			>
				{gift_info.map((item) => (
					<FormField
						key={item.name}
						control={form.control}
						//@ts-expect-error
						name={item.name}
						render={({ field }) => (
							<FormItem className="flex items-center justify-between gap-5">
								<FormLabel>{item.label}</FormLabel>
								<FormControl className="max-w-[70%]">
									<div className="flex flex-col w-full relative">
										<Input
											className="w-full placeholder:opacity-40"
											placeholder={item.placeholder}
											type={item.name === "name" ? "text" : "number"}
											{...field}
										/>
										<FormMessage className="absolute -top-4 right-0" />
									</div>
								</FormControl>
							</FormItem>
						)}
					/>
				))}

				<div className="flex justify-end gap-2 mt-5">
					<Button
						onClick={() => router.push("/gifts")}
						variant="outline"
						type="button"
					>
						ยกเลิก
					</Button>
					<Button type="submit">บันทึก</Button>
				</div>
			</form>
		</Form>
	);
};

export default GiftForm;