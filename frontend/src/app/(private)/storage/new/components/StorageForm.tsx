"use client";

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IStorage } from "@/types/Storage";
import { createStorage, editStorage } from "@/services/StorageService";
import { getDate } from "@/util/GetDateString";

const storageFormSchema = z.object({
	storage_name: z.string().nonempty("กรุณากรอกชื่อสถานที่จัดเก็บ"),
	address: z.string().nonempty("กรุณากรอกที่อยู่"),
	phone: z.string().nonempty("กรุณากรอกเบอร์โทรศัพท์"),
});

type storageFormData = z.infer<typeof storageFormSchema>;

interface StorageFormProps {
	storage?: IStorage;
}

const StorageForm = ({ storage }: StorageFormProps) => {
	const form = useForm<storageFormData>({
		defaultValues: {
			storage_name: storage?.storage_name,
			address: storage?.address,
			phone: storage?.phone,
		},
		resolver: zodResolver(storageFormSchema),
	});

	const router = useRouter();

	const onSubmit = async (values: any) => {
		const payload = { ...values };

		if (!storage) {
			const req = await createStorage(payload);
			if (req.status === "success") {
				toast.success(`เพิ่มสถานที่จัดเก็บ "${values.storage_name}" สำเร็จ`, {
					description: getDate(new Date()),
				});
				router.push("/storage");
				return;
			}

			const error = await req.data;
			Object.keys(error).map((key) => {
				toast.error(`${key}: ${error[key][0]}`);
			});
			return;
		} else {
			const req = await editStorage(storage.id!, payload);
			if (req.status === "success") {
				toast.success(`แก้ไขสถานที่จัดเก็บ "${values.storage_name}" สำเร็จ`, {
					description: getDate(new Date()),
				});
				router.push(`/storage/${storage.id}`);
				return;
			}

			const error = await req.data;
			Object.keys(error).map((key) => {
				toast.error(`${key}: ${error[key][0]}`);
			});
			return;
		}
	};

	const storage_info = () => {
		return [
			{
				label: "ชื่อสถานที่จัดเก็บ",
				name: "storage_name",
				placeholder: "กรอกชื่อสถานที่จัดเก็บ",
			},
			{
				label: "โทรศัพท์",
				name: "phone",
				placeholder: "กรอกเบอร์โทรศัพท์",
			},
			{
				label: "ที่อยู่",
				name: "address",
				placeholder: "กรอกที่อยู่",
			},
		];
	};

	return (
		<Form {...form}>
			<form
				id="storageform"
				onSubmit={form.handleSubmit(onSubmit)}
				className="col-span-2 gridmb-5"
			>
				<div className="mt-3 h-full">
					<div className="container flex flex-col mt-3 gap-2">
						{storage_info().map((item) => (
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
													{...field}
												/>
												<FormMessage className="absolute -top-4 right-0" />
											</div>
										</FormControl>
									</FormItem>
								)}
							/>
						))}
						<div className="flex justify-between mt-5">
							<Button
								onClick={() => router.push("/storage")}
								variant={"outline"}
								type="button"
							>
								ยกเลิก
							</Button>
							<Button form="storageform" type="submit">
								บันทึก
							</Button>
						</div>
					</div>
				</div>
			</form>
		</Form>
	);
};

export default StorageForm;
