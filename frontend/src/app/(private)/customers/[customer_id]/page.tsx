import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { getCustomer } from "@/services/CustomerService";
import { ICustomer } from "@/types/Customer";
import { Separator } from "@/components/ui/separator";
import { Frown, Receipt, History } from "lucide-react";
import Link from "next/link";
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableRow,
} from "@/components/ui/table";
import { getCustomerOrders } from "@/services/OrderService";
import { IOrder } from "@/types/Order";
import { getDate } from "@/util/GetDateString";
import ActionButtons from "./components/ActionButtons";

interface ViewCustomerProps {
	params: {
		customer_id: string;
	};
}

// ✅ ป้าย "ประเภทธุรกรรม" - สีต่างกันตามประเภท (ขาย/ซ่อม/ต่อภาษี+พรบ/อื่นๆ)
const transactionBadgeStyle: Record<string, string> = {
	"ขาย": "bg-blue-100 text-blue-800",
	"ซ่อม": "bg-orange-100 text-orange-800",
	"ต่อภาษี+พรบ": "bg-purple-100 text-purple-800",
	"อื่นๆ": "bg-gray-100 text-gray-800",
};

const ViewCustomer = async ({ params }: ViewCustomerProps) => {
	// ✅ แก้ไข: ใช้ return format จาก getCustomer ที่มี { ok, data, error }
	const result = await getCustomer(parseInt(params.customer_id));
	const customer = result.ok ? result.data : null;

	const customerOrders = (await getCustomerOrders(
		parseInt(params.customer_id)
	)) as IOrder[];

	if (customer === null) {
		return (
			<div className="grid place-items-center h-full w-full">
				<div className="flex items-center justify-center flex-col gap-3">
					<Frown size={"6rem"} opacity={"60%"} />
					<h1>ไม่พบข้อมูลลูกค้า</h1>
					<Link href={"/customers"}>
						<Button>กลับไปหน้าลูกค้า</Button>
					</Link>
				</div>
			</div>
		);
	}

	const genderLabel =
		customer.gender === "M"
			? "ชาย"
			: customer.gender === "F"
			? "หญิง"
			: "-";

	const data = [
		{ label: "เบอร์โทรศัพท์", data: customer.phone },
		{ label: "เพศ", data: genderLabel },
		{ label: "อายุ", data: customer.age },
		{ label: "วันเกิด", data: getDate(customer.dob) },
		{ label: "เลขบัตรประชาชน", data: customer.id_card_number },
		{ label: "ที่อยู่", data: customer.address },
		{ label: "อำเภอ", data: customer.district },
		{ label: "ตำบล", data: customer.subdistrict },
		{ label: "จังหวัด", data: customer.province },
	];


	return (
		<>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/customers">ลูกค้า</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{customer.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<Separator className="my-2" />

			<div className="py-2 grid grid-cols-2 gap-x-5">
				<div className="col-span-2">
					<h2 className="text-3xl font-semibold prompt">{customer.name}</h2>
				</div>

				{/* ข้อมูลลูกค้า */}
				<div>
					<h4 className="text-lg">ข้อมูลลูกค้า</h4>
					<div className="h-[90%] w-full rounded-md mt-3">
						<Table>
							<TableCaption>ข้อมูลของ {customer.name}</TableCaption>
							<TableBody>
								{data.map((row, index) => (
									<TableRow key={index}>
										<TableCell className="font-medium">
											{row.label}
										</TableCell>
										<TableCell className="text-right">
											{row.data || "-"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>

				{/* รายการสั่งซื้อ */}
				<div className="relative">
					<Separator orientation="vertical" className="absolute h-full" />
					<div className="container flex flex-col justify-between h-full">
						<div>
							<h4 className="text-lg">
								รายการสั่งซื้อ ({customerOrders.length})
							</h4>
							<Table>
								<TableBody>
									{customerOrders.length > 0 ? (
										<ScrollArea className="h-[80%]">
											{customerOrders.map((order, index) => {
												// ✅ กันพัง - order ประเภท "อื่นๆ" อาจไม่มีรถผูกอยู่เลย (bikes: [])
												const bike =
													order.bikes && order.bikes.length > 0
														? order.bikes[0]
														: null;
												// ✅ ประเภทธุรกรรม/เลขไมล์ - field ใหม่ (cast any กันเคส type
												// IOrder ยังไม่ได้เพิ่ม field นี้ในไฟล์ types/Order.ts)
												const transactionType =
													(order as any).transaction_type || "ขาย";
												const mileage = (order as any).mileage;

												return (
													<TableRow key={index}>
														<TableCell className="font-medium">
															<div className="flex flex-col gap-1">
																<span>{bike?.model_name || "-"}</span>
																<div className="flex items-center gap-1.5 flex-wrap">
																	<span
																		className={`text-[10px] px-1.5 py-0.5 rounded font-semibold w-fit ${
																			transactionBadgeStyle[transactionType] ||
																			"bg-gray-100 text-gray-800"
																		}`}
																	>
																		{transactionType}
																	</span>
																	{!!mileage && (
																		<span className="text-[10px] text-gray-500">
																			ไมล์ {Number(mileage).toLocaleString()} กม.
																		</span>
																	)}
																	{/* ✅ ดูประวัติเข้ารับบริการทั้งหมดของรถคันนี้ (ไม่ใช่แค่ที่ซื้อ/ทำกับเราครั้งนี้) */}
																	{bike?.id && (
																		<Link
																			href={`/service-history?bike=${bike.id}`}
																			className="text-[10px] text-orange-600 hover:underline flex items-center gap-0.5"
																		>
																			<History size={10} />
																			ดูประวัติรถ
																		</Link>
																	)}
																</div>
															</div>
														</TableCell>
														<TableCell className="text-right">
															{getDate(order.sale_date)}
														</TableCell>
														<TableCell className="text-right">
															<Link href={`/sales/${order.id}`}>
																<Button variant={"outline"}>
																	<Receipt
																		opacity={"80%"}
																		size={"1.2rem"}
																	/>
																</Button>
															</Link>
														</TableCell>
													</TableRow>
												);
											})}
										</ScrollArea>
									) : (
										<TableRow>
											<TableCell className="text-center">
												ลูกค้ารายนี้ยังไม่มีรายการสั่งซื้อ
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
							<Separator className="my-5" />
						</div>

						<ActionButtons customer={customer} />
					</div>
				</div>
			</div>
		</>
	);
};

export default ViewCustomer;