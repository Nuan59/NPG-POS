"use client";

import { Button } from "@/components/ui/button";
import { ICustomer } from "@/types/Customer";
import { Trash2, Pencil, ShoppingCart } from "lucide-react";
import Link from "next/link";
import React, { useContext } from "react";
import DeleteCustomerDialog from "./DeleteCustomerDialog";
import { OrderContext } from "@/context/OrderContext";

const ActionButtons = ({ customer }: { customer: ICustomer }) => {
	const { addCustomerToOrder } = useContext(OrderContext);

	return (
		<div className="w-full flex justify-between">
			<DeleteCustomerDialog customer={customer}>
				<Button className="flex items-center gap-2" variant={"destructive"}>
					<Trash2 size={"1rem"} opacity={"60%"} />
					ลบ
				</Button>
			</DeleteCustomerDialog>

			<div className="flex gap-1">
				<Link href={`/customers/${customer.id}/edit`}>
					<Button variant={"outline"} className="flex items-center gap-2">
						<Pencil size={"1rem"} opacity={"60%"} />
						แก้ไข
					</Button>
				</Link>
				<Button
					onClick={() => addCustomerToOrder(customer)}
					className="flex items-center gap-2"
				>
					<ShoppingCart size={"1rem"} opacity={"60%"} />
					เพิ่ม
				</Button>
			</div>
		</div>
	);
};

export default ActionButtons;
