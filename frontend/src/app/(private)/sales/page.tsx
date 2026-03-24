import { getOrders } from "@/services/OrderService";
import React from "react";
import SalesView from "./views/SalesView";

const Sales = async () => {
	const orders = await getOrders().then((res) => res?.json());

	return <SalesView orders={orders} />;
};

export default Sales;
