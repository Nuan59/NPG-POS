"use client";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderContext } from "@/context/OrderContext";
import React, { ReactNode, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@radix-ui/react-dialog";
import { IAdditionalFee } from "@/types/AdditionalFee";

interface AdditionalFeeDialogProps {
	children: ReactNode;
	fee?: IAdditionalFee;
}

const AdditionalFeeDialog = ({ children, fee }: AdditionalFeeDialogProps) => {
	const { addAdditionalFee, editAdditionalFee } = useContext(OrderContext);

	const [description, setDescription] = useState<string>("");
	const [amount, setAmount] = useState<number | "">("");

	useEffect(() => {
		if (fee) {
			setDescription(fee.description);
			setAmount(fee.amount === 0 ? "" : fee.amount);
		}
	}, [fee]);

	const handleAddFee = () => {
		addAdditionalFee({
			description,
			amount: Number(amount || 0),
		});
		setDescription("");
		setAmount("");
	};

	const handleEditFee = () => {
		if (!fee) return;
		editAdditionalFee({
			id: fee.id,
			description,
			amount: Number(amount || 0),
		});
		setDescription("");
		setAmount("");
	};

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{fee ? "แก้ไข" : "เพิ่ม"} ค่าธรรมเนียม
					</DialogTitle>
					<DialogDescription>
						<div className="mt-2 flex gap-4">
							<div className="flex-1">
								<Label>รายละเอียด</Label>
								<Input
									value={description}
									onChange={(e) => setDescription(e.target.value)}
								/>
							</div>

							<div className="w-40">
								<Label>จำนวนเงิน</Label>
								<Input
									type="number"
									value={amount}
									onFocus={(e) => e.target.value === "0" && setAmount("")}
									onChange={(e) =>
										setAmount(e.target.value === "" ? "" : Number(e.target.value))
									}
								/>
							</div>
						</div>
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					<DialogClose asChild>
						<Button onClick={fee ? handleEditFee : handleAddFee}>
							บันทึก
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default AdditionalFeeDialog;
