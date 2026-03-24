"use client";
import SearchBar from "@/components/global/SearchBar";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IStorage } from "@/types/Storage";
import {
	TooltipProvider,
	Tooltip,
	TooltipTrigger,
	TooltipContent,
} from "@/components/ui/tooltip";
import { Plus, ArrowLeftRight, History } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { StorageColumns } from "../components/StorageColumns";
import Link from "next/link";
import { handleFilter } from "@/app/hooks/useFilter";
import TableLoading from "@/components/global/TableLoading";

interface StoragesViewProps {
	storages: IStorage[];
}

const StoragesView = ({ storages }: StoragesViewProps) => {
	const [searchTerm, setSearchTerm] = useState<string>("");
	const [StoragesDisplay, setStoragesDisplay] = useState<IStorage[]>(storages);

	useEffect(() => {
		setStoragesDisplay(
			handleFilter({ objList: storages, searchTerm }) as IStorage[]
		);
	}, [searchTerm, storages]);

	return (
		<>
			<div className="grid grid-cols-2">
				<div>
					<h2 className="text-3xl font-semibold prompt">สถานที่จัดเก็บ</h2>
					<h6 className="prompt">รวมทั้งหมด: {StoragesDisplay.length}</h6>
				</div>
				<div className="flex flex-col gap-2">
					<SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
					<div className="flex justify-end gap-1">
						<TooltipProvider>
							<Tooltip>
								<Link href={"storage/new"}>
									<TooltipTrigger className="border rounded-sm shadow-sm p-1 hover:bg-slate-100">
										<Plus />
									</TooltipTrigger>
								</Link>
								<TooltipContent>
									<p>เพิ่มสถานที่จัดเก็บ</p>
								</TooltipContent>
							</Tooltip>

							<Tooltip>
								<Link href={"/storage/transfer"}>
									<TooltipTrigger className="border rounded-sm shadow-sm p-1 hover:bg-slate-100">
										<ArrowLeftRight />
									</TooltipTrigger>
								</Link>
								<TooltipContent>
									<p>โอนสินค้า</p>
								</TooltipContent>
							</Tooltip>

							<Tooltip>
								<Link href={"/storage/history"}>
									<TooltipTrigger className="border rounded-sm shadow-sm p-1 hover:bg-slate-100">
										<History />
									</TooltipTrigger>
								</Link>
								<TooltipContent>
									<p>ประวัติการโอนสินค้า</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
			</div>

			<Suspense fallback={<TableLoading />}>
				<ScrollArea className="mt-3">
					<DataTable data={StoragesDisplay} columns={StorageColumns} />
				</ScrollArea>
			</Suspense>
		</>
	);
};

export default StoragesView;
