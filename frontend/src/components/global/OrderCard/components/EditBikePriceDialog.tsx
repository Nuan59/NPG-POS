import { IBike } from "@/types/Bike";
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
import { ReactNode, useContext, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { editBike } from "@/services/InventoryService";
import { toast } from "sonner";
import { OrderContext } from "@/context/OrderContext";
interface EditBikePriceDialogProps {
	bike: IBike;
	children: ReactNode;
}

const EditBikePriceDialog = ({ bike, children }: EditBikePriceDialogProps) => {
	const [newPrice, setNewPrice] = useState<number>(
		parseFloat(bike.sale_price) || 0
	);

	const { addBikeToOrder, removeBikeFromOrder } = useContext(OrderContext);

	const handleEditPrice = async () => {
		//@ts-expect-error
		const edit = await editBike(bike.id, { sale_price: newPrice });
		if (edit.status === "success") {
			toast("Product modified successfully");
			removeBikeFromOrder();
			addBikeToOrder({ ...bike, sale_price: `${newPrice}` });
			setNewPrice(0);
			return;
		}
	};

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit bike price</DialogTitle>
					<DialogDescription>
						<div className="mt-2 flex justify-between">
							<Label htmlFor="description">New price</Label>
							<Input
								value={newPrice}
								onChange={(e) => setNewPrice(parseFloat(e.target.value))}
								id="description"
							/>
						</div>
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose asChild>
						<Button onClick={handleEditPrice}>Edit</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default EditBikePriceDialog;
