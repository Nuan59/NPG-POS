"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download } from "lucide-react";
import { CSVLink } from "react-csv";
import { parse, ParseResult } from "papaparse";
import React, { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { importCustomers } from "@/services/CustomerService";

interface ImportCustomer {
	first_name: string;
	phone: string;
	gender: string;
	birth_date: string;
	age: number;
	citizen_id: string;
	address: string;
	subdistrict: string;
	district: string;
	province: string;
}

const ImportCustomerForm = () => {
	const [customers, setCustomers] = useState<ImportCustomer[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();

	// CSV Template
	const csvHeaders = [
		[
			"ชื่อ",
			"เบอร์โทรศัพท์",
			"เพศ",
			"วันเกิด",
			"อายุ",
			"เลขบัตรประชาชน",
			"ที่อยู่",
			"ตำบล",
			"อำเภอ",
			"จังหวัด",
		],
	];

	const handleFileChoose = (e: ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files) return;
		const file = e.target.files[0];

		parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results: ParseResult<Record<string, string>>) => {
				const mapped: ImportCustomer[] = results.data.map((row) => ({
					first_name: row["First name"] || "",
					phone: row["Phone"] || "",
					gender: row["Gender"] || "",
					birth_date: row["Birth date"] || "",
					age: Number(row["Age"] || 0),
					citizen_id: row["Citizen ID"] || "",
					address: row["Address"] || "",
					subdistrict: row["Subdistrict"] || "",
					district: row["District"] || "",
					province: row["Province"] || "",
				}));

				setCustomers(mapped);
				toast.success(`โหลดข้อมูล ${mapped.length} รายการ`);
			},
			error: () => {
				toast.error("ไม่สามารถอ่านไฟล์ CSV ได้");
			},
		});
	};

	const handleImport = async () => {
		if (customers.length === 0) {
			toast.warning("ไม่มีข้อมูลสำหรับนำเข้า");
			return;
		}

		setIsLoading(true);
		try {
			await importCustomers(customers);
			toast.success("นำเข้าลูกค้าเรียบร้อยแล้ว");
			router.push("/customers");
		} catch (e) {
			console.error(e);
			toast.error("เกิดข้อผิดพลาดในการนำเข้า");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="mt-5 col-span-2 flex flex-col h-full">
			<div className="mb-4 flex items-center gap-3">
				<CSVLink data={csvHeaders} filename="import-customers.csv">
					<Button className="flex gap-2">
						<Download size={18} />
						ดาวน์โหลดไฟล์ตัวอย่าง
					</Button>
				</CSVLink>
			</div>

			<div className="flex flex-col gap-2 mb-4">
				<Label>อัปโหลดไฟล์ลูกค้า (CSV)</Label>
				<Input
					type="file"
					accept=".csv"
					onChange={handleFileChoose}
					disabled={isLoading}
				/>
			</div>

			<Separator className="my-3" />

			<ScrollArea className="h-72">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>ชื่อ</TableHead>
							<TableHead>เบอร์</TableHead>
							<TableHead>เพศ</TableHead>
							<TableHead>วันเกิด</TableHead>
							<TableHead>จังหวัด</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{customers.map((c, idx) => (
							<TableRow key={idx}>
								<TableCell>{c.first_name}</TableCell>
								<TableCell>{c.phone}</TableCell>
								<TableCell>{c.gender}</TableCell>
								<TableCell>{c.birth_date}</TableCell>
								<TableCell>{c.province}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</ScrollArea>

			<div className="mt-5 flex justify-between">
				<Button
					variant="outline"
					onClick={() => router.push("/customers")}
					disabled={isLoading}
				>
					ยกเลิก
				</Button>

				<Button
					onClick={handleImport}
					disabled={isLoading || customers.length === 0}
				>
					{isLoading ? "กำลังนำเข้า..." : "นำเข้า"}
				</Button>
			</div>
		</div>
	);
};

export default ImportCustomerForm;
