import React from "react";
import InventoryBrands from "../components/InventoryBrands";
import InventoryModels from "../components/InventoryModels";
import InventoryStorages from "../components/InventoryStorages";

const InventoryReport = () => {
	return (
		<div className="grid grid-cols-4 h-full">
			<InventoryModels />
			<div className="flex flex-col justify-start">
				<InventoryBrands />
				<InventoryStorages />
			</div>
		</div>
	);
};

export default InventoryReport;
