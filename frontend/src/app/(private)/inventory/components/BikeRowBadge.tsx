"use client";

import React, { useContext } from "react";
import { IBike } from "@/types/Bike";
import { OrderContext } from "@/context/OrderContext";
import ProductBadge from "./ProductBadge";

const BikeRowBadge = ({ bike }: { bike: IBike }) => {
	const { orderBike } = useContext(OrderContext);

	if (bike.sold) {
		return <ProductBadge type="sold" />;
	}

	if (orderBike?.id === bike.id) {
		return <ProductBadge type="order" />;
	}

	return <ProductBadge type="available" />;
};

export default BikeRowBadge;
