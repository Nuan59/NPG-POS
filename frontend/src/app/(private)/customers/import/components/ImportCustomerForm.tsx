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
import { Progress } from "@/components/ui/progress";
import { Download, MapPin } from "lucide-react";
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
	latitude?: number | null;
	longitude?: number | null;
}

const ImportCustomerForm = () => {
	const [customers, setCustomers] = useState<ImportCustomer[]>([]);
	const [isGeocoding, setIsGeocoding] = useState(false);
	const [geocodingProgress, setGeocodingProgress] = useState(0);
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

	// ฟังก์ชันแปลงที่อยู่เป็นพิกัด
	const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
		const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
		
		if (!apiKey) {
			console.error("Google Maps API Key not found");
			return null;
		}

		try {
			const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
			const response = await fetch(url);
			const data = await response.json();

			if (data.status === "OK" && data.results.length > 0) {
				const location = data.results[0].geometry.location;
				return {
					lat: location.lat,
					lng: location.lng,
				};
			}
			
			console.warn(`Geocoding failed for: ${address}`, data.status);
			return null;
		} catch (error) {
			console.error("Geocoding error:", error);
			return null;
		}
	};

	// แปลงที่อยู่ทั้งหมดเป็นพิกัด
	const geocodeAllAddresses = async (customersList: ImportCustomer[]): Promise<ImportCustomer[]> => {
		setIsGeocoding(true);
		setGeocodingProgress(0);

		const results: ImportCustomer[] = [];
		const total = customersList.length;

		for (let i = 0; i < customersList.length; i++) {
			const customer = customersList[i];
			
			// สร้างที่อยู่เต็ม
			const fullAddress = `${customer.address} ${customer.subdistrict} ${customer.district} ${customer.province} ประเทศไทย`;
			
			// แปลงเป็นพิกัด
			const coordinates = await geocodeAddress(fullAddress);
			
			// เก็บข้อมูลพร้อมพิกัด
			results.push({
				...customer,
				latitude: coordinates?.lat || null,
				longitude: coordinates?.lng || null,
			});

			// อัพเดทความคืบหน้า
			setGeocodingProgress(Math.round(((i + 1) / total) * 100));

			// หน่วงเวลา 200ms เพื่อไม่ให้เกิน rate limit
			await new Promise(resolve => setTimeout(resolve, 200));
		}

		setIsGeocoding(false);
		return results;
	};

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

	const handleGeocodeAndImport = async () => {
		if (customers.length === 0) {
			toast.warning("ไม่มีข้อมูลสำหรับนำเข้า");
			return;
		}

		try {
			// แปลงที่อยู่เป็นพิกัด
			toast.info("กำลังแปลงที่อยู่เป็นพิกัด...");
			const customersWithCoordinates = await geocodeAllAddresses(customers);

			// นับจำนวนที่แปลงสำเร็จ
			const successCount = customersWithCoordinates.filter(c => c.latitude && c.longitude).length;
			const failCount = customersWithCoordinates.length - successCount;

			if (failCount > 0) {
				toast.warning(`แปลงพิกัดสำเร็จ ${successCount} รายการ, ไม่สำเร็จ ${failCount} รายการ`);
			} else {
				toast.success(`แปลงพิกัดสำเร็จทั้งหมด ${successCount} รายการ`);
			}

			// นำเข้าลูกค้า
			await importCustomers(customersWithCoordinates);
			toast.success("นำเข้าลูกค้าเรียบร้อยแล้ว");
			router.push("/customers");
		} catch (e) {
			console.error(e);
			toast.error("เกิดข้อผิดพลาดในการนำเข้า");
			setIsGeocoding(false);
		}
	};

	const handleSubmitWithoutGeocoding = async () => {
		if (customers.length === 0) {
			toast.warning("ไม่มีข้อมูลสำหรับนำเข้า");
			return;
		}

		try {
			await importCustomers(customers);
			toast.success("นำเข้าลูกค้าเรียบร้อยแล้ว (ไม่มีพิกัด)");
			router.push("/customers");
		} catch (e) {
			console.error(e);
			toast.error("เกิดข้อผิดพลาดในการนำเข้า");
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
					disabled={isGeocoding}
				/>
			</div>

			{/* Progress Bar สำหรับ Geocoding */}
			{isGeocoding && (
				<div className="mb-4">
					<Label className="mb-2 flex items-center gap-2">
						<MapPin size={16} />
						กำลังแปลงที่อยู่เป็นพิกัด... {geocodingProgress}%
					</Label>
					<Progress value={geocodingProgress} className="w-full" />
				</div>
			)}

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
					disabled={isGeocoding}
				>
					ยกเลิก
				</Button>
				
				<div className="flex gap-2">
					{/* ปุ่มนำเข้าไม่มีพิกัด */}
					<Button 
						variant="outline"
						onClick={handleSubmitWithoutGeocoding}
						disabled={isGeocoding || customers.length === 0}
					>
						นำเข้า (ไม่มีพิกัด)
					</Button>
					
					{/* ปุ่มนำเข้าพร้อมแปลงพิกัด */}
					<Button 
						onClick={handleGeocodeAndImport}
						disabled={isGeocoding || customers.length === 0}
						className="flex gap-2"
					>
						<MapPin size={16} />
						นำเข้า + แปลงพิกัด
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ImportCustomerForm;