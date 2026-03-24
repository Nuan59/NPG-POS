"use client";

import SalePayments from "../components/SalePayments";
import SaleTrends from "../components/SaleTrends";
import VehicleTypeSales from "../components/VehicleTypeSales";
import ModelSales from "../components/ModelSales";

const SalesReports = () => {
	return (
		<div
			className="
				flex flex-col gap-5 h-full w-full
				origin-top scale-[0.8]   /* ← ลด ~20% */
			"
		>
			<SaleTrends />
			<ModelSales />

			<div className="flex flex-col xl:flex-row gap-5 w-full items-stretch">
				<div className="w-full xl:w-1/2">
					<SalePayments />
				</div>
				<div className="w-full xl:w-1/2">
					<VehicleTypeSales />
				</div>
			</div>
		</div>
	);
};

export default SalesReports;
