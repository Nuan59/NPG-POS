"use client";
import { getInventoryBrandsReport } from "@/services/ReportsService";
import React, { useEffect, useState } from "react";
import {
	PieChart,
	Pie,
	Cell,
	ResponsiveContainer,
	Legend,
	Tooltip,
} from "recharts";
import { generateNpgReadableColor, resetGeneratedColors } from "../util/colors";

const InventoryBrands = () => {
	const [reportData, setReportData] = useState([]);
	const [colors, setColors] = useState<string[]>([]);

	useEffect(() => {
		const getData = async () => {
			try {
				const { data } = await getInventoryBrandsReport();
				setReportData(data);
				
				// สร้างสีสำหรับแต่ละ brand
				resetGeneratedColors();
				const generatedColors = data.map(() => generateNpgReadableColor());
				setColors(generatedColors);
			} catch (error) {
				console.error("Error fetching inventory brands:", error);
				setReportData([]);
			}
		};

		getData();
	}, []);

	const total = reportData.reduce((sum, item) => sum + (item.total || 0), 0);

	return (
		<div className="flex flex-col col-span-1 items-center justify-center">
			<h2 className="text-lg font-semibold mb-4">จำนวนรถตามยี่ห้อในสต็อก</h2>
			
			<div className="flex flex-row items-center justify-center gap-6 w-full">
				{/* Pie Chart */}
				<ResponsiveContainer width="50%" height={220}>
					<PieChart>
						<Pie 
							nameKey={"brand"} 
							data={reportData} 
							dataKey={"total"}
							cx="50%"
							cy="50%"
							labelLine={false}
							label={({ brand, total, percent }) => 
								`${brand}: ${total} คัน (${(percent * 100).toFixed(1)}%)`
							}
							outerRadius={80}
						>
							{reportData.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={colors[index] || "#8884d8"} />
							))}
						</Pie>
						<Tooltip formatter={(value: number) => [`${value} คัน`, ""]} />
						<Legend />
					</PieChart>
				</ResponsiveContainer>

				{/* สรุปตัวเลข */}
				<div className="flex flex-col gap-3">
					{reportData.map((item, index) => (
						<div key={index} className="flex items-center gap-2">
							<div
								className="w-6 h-6 rounded"
								style={{ backgroundColor: colors[index] || "#8884d8" }}
							/>
							<div className="flex flex-col">
								<span className="text-sm text-gray-600">{item.brand}</span>
								<span className="text-xl font-bold">{item.total} คัน</span>
							</div>
						</div>
					))}
					<div className="mt-2 pt-3 border-t">
						<span className="text-sm text-gray-600">รวมทั้งหมด</span>
						<div className="text-2xl font-bold text-orange-600">
							{total} คัน
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default InventoryBrands;