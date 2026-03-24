"use client";
import { Button } from "@/components/ui/button";
import { IBike } from "@/types/Bike";
import { Trash2, Pencil, ShoppingCart } from "lucide-react";
import Link from "next/link";
import React, { useContext } from "react";
import DeleteBikeDialog from "./DeleteBikeDialog";
import { OrderContext } from "@/context/OrderContext";

interface ActionButtonsProps {
	bike: IBike;
}

const ActionButtons = ({ bike }: ActionButtonsProps) => {
	const { addBikeToOrder } = useContext(OrderContext);

	return (
		<div className="w-full flex justify-between">
			<DeleteBikeDialog bike={bike}>
				<Button className="flex items-center gap-2" variant={"destructive"}>
					<Trash2 size={"1rem"} opacity={"60%"} />
					Delete
				</Button>
			</DeleteBikeDialog>

			<div className="flex gap-1">
				<Link href={`/inventory/${bike.id}/edit`}>
					<Button variant={"outline"} className="flex items-center gap-2">
						<Pencil size={"1rem"} opacity={"60%"} />
						Edit
					</Button>
				</Link>
				<Button
					onClick={() => addBikeToOrder(bike)}
					className="flex items-center gap-2"
				>
					<ShoppingCart size={"1rem"} opacity={"60%"} />
					Add
				</Button>
			</div>
		</div>
	);
};

export default ActionButtons;
