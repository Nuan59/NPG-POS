"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { getDate } from "@/util/GetDateString";
import { IBike } from "@/types/Bike";
import { IStorage } from "@/types/Storage";

interface TransferHistoryItem {
	id: number;
	transfer_date: Date | string;
	bikes: IBike[];
	origin: IStorage;
	destination: IStorage;
}

export const TransferHistoryColumns: ColumnDef<TransferHistoryItem>[] = [
	{
		accessorKey: "transfer_date",
		header: "วันที่โอนย้าย",
		cell: ({ row }) => {
			const item = row.original;
			return <span>{getDate(item.transfer_date)}</span>;
		},
	},
	{
		accessorKey: "origin",
		header: "ต้นทาง",
		cell: ({ row }) => {
			const item = row.original;
			return <span>{item.origin?.storage_name}</span>;
		},
	},
	{
		accessorKey: "destination",
		header: "ปลายทาง",
		cell: ({ row }) => {
			const item = row.original;
			return <span>{item.destination?.storage_name}</span>;
		},
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const item = row.original;

			return (
				<Link href={`/storage/transfer/receipt/${item.id}`}>
					<Button variant={"outline"}>
						<Receipt size={"1.2rem"} opacity={"60%"} />
					</Button>
				</Link>
			);
		},
	},
];
