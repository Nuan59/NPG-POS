"use client";

import { IBike } from "@/types/Bike";
import { ColumnDef } from "@tanstack/react-table";

import BikeRowButtons from "./BikeRowButtons";
import BikeRowBadge from "./BikeRowBadge";

export const BikeColumns: ColumnDef<IBike>[] = [
	{
		accessorKey: "brand",
		header: "ยี่ห้อ",
		cell: ({ row }) => row.original.brand || "-",
	},
	{
		accessorKey: "model_name",
		header: "ชื่อรุ่น",
		cell: ({ row }) => row.original.model_name || "-",
	},
	{
		accessorKey: "model_code",
		header: "รหัสรุ่น",
		cell: ({ row }) => row.original.model_code || "-",
	},
	{
		accessorKey: "engine",
		header: "เลขตัวเครื่อง",
		cell: ({ row }) => {
			const engine = row.original.engine;
			return engine ? String(engine) : "-";
		},
	},
	{
		accessorKey: "chassis",  // ✅ แก้เป็น chassis
		header: "เลขตัวถัง",
		cell: ({ row }) => {
			const chassis = row.original.chassis;
			return chassis ? String(chassis) : "-";
		},
	},
	{
		accessorKey: "sold",
		header: "สถานะ",
		cell: ({ row }) => {
			const bike = row.original;
			if (!bike) return "-";
			return <BikeRowBadge bike={bike} />;
		},
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const bike = row.original;
			if (!bike) return null;
			return <BikeRowButtons bike={bike} />;
		},
	},
];