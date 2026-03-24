"use client";

import SearchBar from "@/components/global/SearchBar";
import { DataTable } from "@/components/ui/data-table";
import { ICustomer } from "@/types/Customer";
import {
	TooltipProvider,
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import { Plus, Download, Upload } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { CustomerColumns } from "../components/CustomerColumns";
import Link from "next/link";
import { CSVLink } from "react-csv";
import { handleFilter } from "@/app/hooks/useFilter";
import TableLoading from "@/components/global/TableLoading";

interface CustomersViewProps {
	customers: ICustomer[];
	isAdmin: boolean; // ✅ ใช้ตัวเดียวพอ
}

const CustomersView = ({ customers, isAdmin }: CustomersViewProps) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [customersDisplay, setCustomersDisplay] =
		useState<ICustomer[]>(customers);

	useEffect(() => {
		setCustomersDisplay(
			handleFilter({ objList: customers, searchTerm }) as ICustomer[]
		);
	}, [searchTerm, customers]);

	return (
		<>
			<div className="grid grid-cols-2">
				<div>
					<h2 className="text-3xl font-semibold">ลูกค้า</h2>
					<h6>รวมทั้งหมด: {customersDisplay.length}</h6>
				</div>

				<div className="flex flex-col gap-2">
					<SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

					<div className="flex justify-end gap-1">
						<TooltipProvider>
							{/* เพิ่มลูกค้า */}
							<Tooltip>
								<Link href="/customers/new">
									<TooltipTrigger className="border rounded-sm shadow-sm p-1 hover:bg-slate-100">
										<Plus />
									</TooltipTrigger>
								</Link>
								<TooltipContent>เพิ่มลูกค้า</TooltipContent>
							</Tooltip>

							{/* IMPORT ลูกค้า */}
							<Tooltip>
								<Link href="/customers/import">
									<TooltipTrigger className="border rounded-sm shadow-sm p-1 hover:bg-slate-100">
										<Download />
									</TooltipTrigger>
								</Link>
								<TooltipContent>นำเข้าลูกค้า</TooltipContent>
							</Tooltip>

							{/* EXPORT ลูกค้า (เฉพาะ adm) */}
							{isAdmin && (
								<Tooltip>
									<TooltipTrigger className="border rounded-sm shadow-sm p-1 hover:bg-slate-100">
										<CSVLink
											filename="customers.csv"
											data={customers}
										>
											<Upload />
										</CSVLink>
									</TooltipTrigger>
									<TooltipContent>
										ส่งออกข้อมูลลูกค้า
									</TooltipContent>
								</Tooltip>
							)}
						</TooltipProvider>
					</div>
				</div>
			</div>

			<Suspense fallback={<TableLoading />}>
				<div className="h-[85%] mt-3 overflow-auto">
					<DataTable data={customersDisplay} columns={CustomerColumns} />
				</div>
			</Suspense>
		</>
	);
};

export default CustomersView;