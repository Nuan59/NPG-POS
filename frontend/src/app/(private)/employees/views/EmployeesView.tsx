"use client";
import SearchBar from "@/components/global/SearchBar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IEmployee } from "@/types/IEmployee";
import {
	TooltipProvider,
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import { Plus, Download } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { EmployeeColumns } from "../components/EmployeeColumns";
import Link from "next/link";
import { handleFilter } from "@/app/hooks/useFilter";
import TableLoading from "@/components/global/TableLoading";

interface EmployeesViewProps {
	employees: IEmployee[];
}

const EmployeesView = ({ employees }: EmployeesViewProps) => {
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [EmployeesDisplay, setEmployeesDisplay] =
		useState<IEmployee[]>(employees);

	useEffect(() => {
		setEmployeesDisplay(
			handleFilter({ searchTerm, objList: employees }) as IEmployee[]
		);
	}, [searchTerm, employees]);

	return (
		<>
			<div className="grid grid-cols-2">
				<div>
					<h2 className="text-3xl font-semibold prompt">พนักงาน</h2>
					<h6 className="prompt">รวมทั้งหมด: {EmployeesDisplay.length}</h6>
				</div>
				<div className="flex flex-col gap-2">
					<SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
					<div className="flex justify-end gap-1">
						<TooltipProvider>
							<Tooltip>
								<Link href={`/employees/new`}>
									<TooltipTrigger className="border rounded-sm shadow-sm p-1 hover:bg-slate-100">
										<Plus />
									</TooltipTrigger>
								</Link>
								<TooltipContent>
									<p>เพิ่มพนักงาน</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
			</div>

			<Suspense fallback={<TableLoading />}>
				<ScrollArea className="mt-3">
					<DataTable data={EmployeesDisplay} columns={EmployeeColumns} />
				</ScrollArea>
			</Suspense>
		</>
	);
};

export default EmployeesView;
