"use client";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { deleteBike } from "@/services/InventoryService";
import { IBike } from "@/types/Bike";
import { getDate } from "@/util/GetDateString";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

interface DeleteBikeDialogProps {
	bike: IBike;
	children: React.ReactNode;
}

const DeleteBikeDialog = ({ bike, children }: DeleteBikeDialogProps) => {
	const router = useRouter();

	const handleDeleteBike = async () => {
		const del = await deleteBike(bike.id);

		if (del) {
			router.push("/inventory");
			toast(`Bike ${bike.model_name} has been deleted`, {
				description: getDate(new Date()),
			});
		}
	};

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Confirm delete bike {bike.model_name}?</DialogTitle>
				</DialogHeader>
				<DialogFooter className="sm:justify-between">
					<DialogClose asChild>
						<Button variant="secondary">Cancel</Button>
					</DialogClose>
					<Button
						onClick={handleDeleteBike}
						className="flex items-center gap-2"
						variant={"destructive"}
					>
						<Trash2 size={"1rem"} opacity={"60%"} />
						Yes, delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default DeleteBikeDialog;
