"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ICustomer } from "@/types/Customer";
import CustomerRowButtons from "./CustomerRowButtons";

export const CustomerColumns: ColumnDef<ICustomer>[] = [
	{
		accessorKey: "name",
		header: "ชื่อลูกค้า",
	},
	{
		accessorKey: "phone",
		header: "เบอร์โทรศัพท์",
	},
	{
		accessorKey: "address",
		header: "ที่อยู่",
	},
	{
		accessorKey: "province",
		header: "จังหวัด",
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const customer = row.original;

			return <CustomerRowButtons customer={customer} />;
		},
	},
];
