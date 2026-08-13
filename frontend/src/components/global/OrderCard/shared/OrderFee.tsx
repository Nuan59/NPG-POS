import { OrderContext } from "@/context/OrderContext";
import { IAdditionalFee } from "@/types/AdditionalFee";
import { X, Pencil } from "lucide-react";
import React, { useContext } from "react";
import AdditionalFeeDialog from "./AdditionalFeeDialog";

interface OrderFeeProps {
	fee: IAdditionalFee;
}

const OrderFee = ({ fee }: OrderFeeProps) => {
	const { removeAdditionalFee } = useContext(OrderContext);

	return (
		<div className="group bg-slate-700 text-slate-50 m-1 p-2 rounded-lg text-sm font-extrabold">
			<div className="flex justify-between">
				<span>{fee.description}</span>
				<span>฿ {fee.amount}</span>
			</div>

			<div className="flex gap-1 justify-end items-end">
				<div
					onClick={() => removeAdditionalFee(fee.id)}
					className="bg-slate-50 p-1 mt-3 w-fit hidden rounded group-hover:flex hover:cursor-pointer hover:scale-110 hover:rounded-sm"
				>
					<X className="text-slate-800" size={14} />
				</div>

				<AdditionalFeeDialog fee={fee}>
					<div className="bg-slate-50 p-1 mt-3 w-fit hidden rounded group-hover:flex hover:cursor-pointer hover:scale-110 hover:rounded-sm">
						<Pencil className="text-slate-800" size={14} />
					</div>
				</AdditionalFeeDialog>
			</div>
		</div>
	);
};

export default OrderFee;