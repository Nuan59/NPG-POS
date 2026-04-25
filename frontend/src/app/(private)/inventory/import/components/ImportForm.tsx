"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import { Separator } from "@/components/ui/separator";

import { importInventory } from "@/services/InventoryService";
import { IBike } from "@/types/Bike";
import { IStorage } from "@/types/Storage";
import { getDate } from "@/util/GetDateString";
import { Download } from "lucide-react";
import { parse, ParseResult } from "papaparse";
import React, { ChangeEvent, useState } from "react";
import { CSVLink } from "react-csv";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ImportFormsProps {
	storages: IStorage[];
}

// แปลงวันที่รูปแบบ DD/MM/YY หรือ DD/MM/YYYY (พ.ศ.) เป็น YYYY-MM-DD (ค.ศ.)
const parseThaiDate = (dateStr: string): string => {
	if (!dateStr) return "";
	const parts = String(dateStr).split("/");
	if (parts.length !== 3) return "";
	const day = parts[0].padStart(2, "0");
	const month = parts[1].padStart(2, "0");
	let year = parseInt(parts[2]);
	// ถ้าปีน้อยกว่า 100 คือย่อ เช่น 65 -> 2565
	if (year < 100) year += 2500;
	// แปลง พ.ศ. -> ค.ศ.
	if (year > 2400) year -= 543;
	return `${year}-${month}-${day}`;
};

const ImportForm = ({ storages }: ImportFormsProps) => {
	const [bikesImport, setBikesImport] = useState<IBike[]>([]);
	const [selectedStorage, setSelectedStorage] = useState<number>(0);

	const csvHeaders = [
		[
			"ชื่อรุ่น",
			"รหัสรุ่น",
			"เลขเครื่อง",
			"เลขถัง",
			"ทะเบียนเก่า",
			"ทะเบียนใหม่",
			"สี",
			"หมายเหตุ",
			"ประเภท",
			"ยี่ห้อ",
			"วันที่รับ",
			"ราคาขายส่ง",
		],
	];

	const handleFileChoose = async (e: ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const file = e.target.files[0];
			const newBikes = [] as IBike[];

			parse(file, {
				dynamicTyping: true,
				header: true,
				complete: (results: ParseResult<Record<string, unknown>>) => {
					results.data.map((obj) => {
						// ✅ รองรับทั้ง header ภาษาไทยและอังกฤษ
						const bike = {
							model_name: obj["ชื่อรุ่น"] || obj["Model name"],
							model_code: obj["รหัสรุ่น"] || obj["Model code"],
							engine: obj["เลขเครื่อง"] || obj["Engine"],
							chassi: obj["เลขถัง"] || obj["Chassis"],
							old_registration_plate: String(obj["ทะเบียนเก่า"] || obj["Old registration plate"] || "") || undefined,
							registration_plate: obj["ทะเบียนใหม่"] || obj["Registration plate"] || obj["ทะเบียน"],
							color: obj["สี"] || obj["Color"],
							notes: String(obj["หมายเหตุ"] || obj["Notes"] || ""),
							category: obj["ประเภท"] || obj["Category"] || obj["ประเภทสินค้า"] || "new",
							brand: obj["ยี่ห้อ"] || obj["Brand"],
							received_date: parseThaiDate(String(obj["วันที่รับ"] || obj["Received date"] || "")),
							wholesale_price: String(obj["ราคาขายส่ง"] || obj["Wholesale price"] || ""),
						} as IBike;
						
						// ✅ เช็คว่ามีข้อมูลจริงๆ (ไม่ใช่แถวว่าง)
						if (bike.engine && bike.chassi) {
							newBikes.push(bike);
						}
					});

					setBikesImport(newBikes);
					
					if (newBikes.length > 0) {
						toast.success(`โหลดข้อมูล ${newBikes.length} รายการสำเร็จ`);
					} else {
						toast.warning("ไม่พบข้อมูลในไฟล์");
					}
				},
				error: (error) => {
					console.error("Parse error:", error);
					toast.error("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์");
				},
			});
		}
	};

	const router = useRouter();

	const handleSubmitImport = () => {
		if (selectedStorage === 0) {
			toast.warning("กรุณาเลือกสถานที่จัดเก็บก่อน");
			return;
		}

		if (bikesImport.length === 0) {
			toast.warning("กรุณาอัปโหลดไฟล์ข้อมูลก่อน");
			return;
		}

		importInventory({ storage: selectedStorage, bikes: bikesImport }).then(
			async (res) => {
				const data = res.data ? await res.data : null;
				const created = data?.created_ids?.length || 0;
				const errors = data?.errors || [];

				if (created > 0) {
					setBikesImport([]);
					setSelectedStorage(0);
					toast.success(`นำเข้าสินค้าสำเร็จ ${created} รายการ`, {
						description: getDate(new Date()),
					});
					if (errors.length > 0) {
						toast.warning(`ข้ามไป ${errors.length} รายการ (ซ้ำหรือผิดพลาด)`);
					}
					router.push("/inventory");
				} else if (errors.length > 0) {
					toast.error(`นำเข้าไม่สำเร็จ: ข้อมูลซ้ำทั้งหมด ${errors.length} รายการ`);
				} else {
					toast.error("นำเข้าสินค้าไม่สำเร็จ");
				}
			}
		);
	};

	const bikeProperties = [
		{ label: "ยี่ห้อ", value: "brand" },
		{ label: "ชื่อรุ่น", value: "model_name" },
		{ label: "รหัสรุ่น", value: "model_code" },
		{ label: "เลขเครื่อง", value: "engine" },
		{ label: "เลขถัง", value: "chassi" },
		{ label: "ทะเบียนเก่า", value: "old_registration_plate" },
		{ label: "ทะเบียนใหม่", value: "registration_plate" },
		{ label: "สี", value: "color" },
		{ label: "หมายเหตุ", value: "notes" },
		{ label: "ประเภท", value: "category" },
		{ label: "วันที่รับ", value: "received_date" },
		{ label: "ราคาขายส่ง", value: "wholesale_price" },
	];

	return (
		<div className="mt-5 col-span-2 flex flex-col gap-4">
			<div className="font-extrabold flex items-center gap-2">
				<span>1.</span>
				<CSVLink data={csvHeaders} filename="import-inventory.csv">
					<Button className="flex gap-2 font-extrabold text-white">
						<Download size={"1.2rem"} opacity={"60%"} />
						ดาวน์โหลดไฟล์ตัวอย่าง
					</Button>
				</CSVLink>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="select-form" className="font-extrabold">
					2. เลือกสถานที่จัดเก็บ
				</Label>
				<Select 
					value={selectedStorage.toString()}
					onValueChange={(value) => setSelectedStorage(parseInt(value))}
				>
					<SelectTrigger id="select-form" className="w-[300px]">
						<SelectValue placeholder="เลือกคลังสินค้า" />
					</SelectTrigger>
					<SelectContent>
						{storages.map((storage) => (
							<SelectItem key={storage.id} value={`${storage.id}`}>
								{storage.storage_name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="upload-form" className="font-extrabold">
					3. อัปโหลดไฟล์ข้อมูลสินค้า
				</Label>
				<Input
					accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
					id="upload-form"
					onChange={(e) => handleFileChoose(e)}
					className="w-[300px]"
					type="file"
				/>
			</div>

			<Separator className="my-4" />

			{bikesImport.length > 0 ? (
				<div className="border rounded-lg">
					<ScrollArea className="h-[400px] w-full">
						<Table>
							<TableCaption>รายการสินค้าที่จะนำเข้า ({bikesImport.length} รายการ)</TableCaption>
							<TableHeader>
								<TableRow>
									{bikeProperties.map((prop) => (
										<TableHead key={prop.value} className="min-w-[120px]">
											{prop.label}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{bikesImport.map((bike, index) => (
									<TableRow key={index}>
										{bikeProperties.map((prop) => (
											<TableCell key={prop.value} className="min-w-[120px]">
												{/* @ts-expect-error */}
												{bike[prop.value] || "-"}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</ScrollArea>
				</div>
			) : (
				<div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
					<p className="text-sm">ยังไม่มีข้อมูล กรุณาอัปโหลดไฟล์</p>
				</div>
			)}

			<div className="flex justify-between mt-4">
				<Link href={"/inventory"}>
					<Button variant={"outline"}>ยกเลิก</Button>
				</Link>
				<Button 
					onClick={handleSubmitImport}
					disabled={bikesImport.length === 0 || selectedStorage === 0}
				>
					นำเข้าสินค้า ({bikesImport.length} รายการ)
				</Button>
			</div>
		</div>
	);
};

export default ImportForm;