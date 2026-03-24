"use client";
import { getInventoryModelsReport } from "@/services/ReportsService";
import React, { useEffect, useState } from "react";
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	CartesianGrid,
	Legend,
	Tooltip,
	XAxis,
	YAxis,
	Cell,
} from "recharts";
import { generateNpgReadableColor, resetGeneratedColors } from "../util/colors";

const InventoryModels = () => {
	const [reportData, setReportData] = useState([]);
	const [colors, setColors] = useState<string[]>([]);

	useEffect(() => {
		const getData = async () => {
			try {
				const { data } = await getInventoryModelsReport();
				console.log("Inventory Models Data:", data);
				setReportData(data);
				
				// สร้างสีสำหรับแต่ละ model
				resetGeneratedColors();
				const generatedColors = data.map(() => generateNpgReadableColor());
				setColors(generatedColors);
			} catch (error) {
				console.error("Error fetching inventory models:", error);
				setReportData([]);
			}
		};

		getData();
	}, []);

	return (
		<div className={"col-span-3 flex flex-col items-center justify-start"}>
			<h2 className="text-xl font-semibold mb-4">จำนวนรถตามรุ่นในสต็อก</h2>
			<ResponsiveContainer width={"100%"} height={500}>
				<BarChart
					data={reportData}
					margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
				>
					<CartesianGrid strokeDasharray="3 3" />
					<XAxis
						tick={{ fontSize: 10 }}
						dataKey="model_name"
						angle={-45}
						textAnchor="end"
						interval={0}
						height={80}
					/>
					<YAxis 
						dataKey="total"
						allowDecimals={false}
						label={{ value: 'จำนวน (คัน)', angle: -90, position: 'insideLeft' }}
					/>
					<Tooltip 
						formatter={(value: number) => [`${value} คัน`, "จำนวน"]}
						labelFormatter={(label) => `รุ่น: ${label}`}
					/>
					<Legend />
					<Bar 
						dataKey="total" 
						name="จำนวนรถในสต็อก"
						radius={[8, 8, 0, 0]}
					>
						{reportData.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={colors[index] || "#8884d8"} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};

export default InventoryModels;