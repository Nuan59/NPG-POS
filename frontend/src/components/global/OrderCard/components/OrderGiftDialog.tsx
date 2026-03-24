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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { OrderContext } from "@/context/OrderContext";
import { getGifts } from "@/services/GiftService";
import { Gift, OrderGift } from "@/types/Gift";
import React, { ReactNode, useContext, useEffect, useState } from "react";

interface OrderGiftDialogProps {
	children: ReactNode;
	gift?: OrderGift;
}

const OrderGiftDialog = ({ children, gift }: OrderGiftDialogProps) => {
	const { addOrderGift, editOrderGift, orderGifts } =
		useContext(OrderContext);

	const [allGifts, setAllGifts] = useState<Gift[]>([]);
	const [orderGiftsIds, setOrderGiftsIds] = useState<number[]>([]);

	const [id, setId] = useState<string>("");
	const [name, setName] = useState<string>("");
	const [amount, setAmount] = useState<number | "">("");

	const [selectedGiftAvailableStock, setSelectedGiftAvailableStock] =
		useState<number | undefined>(undefined);

	const [canAddGift, setCanAddGift] = useState<boolean>(true);

	useEffect(() => {
		getGifts().then(setAllGifts);
	}, []);

	useEffect(() => {
		setOrderGiftsIds(orderGifts.map((item) => item.id));
	}, [orderGifts]);

	useEffect(() => {
		if (gift) {
			setId(gift.id.toString());
			setName(gift.name);
			setAmount(gift.amount === 0 ? "" : gift.amount);
		}
	}, [gift]);

	useEffect(() => {
		const selected = allGifts.find((g) => g.id.toString() === id);
		setName(selected ? selected.name : "");
		setSelectedGiftAvailableStock(selected?.stock);
	}, [id, allGifts]);

	useEffect(() => {
		if (!selectedGiftAvailableStock) {
			setCanAddGift(false);
			return;
		}
		setCanAddGift(Number(amount || 0) <= selectedGiftAvailableStock);
	}, [amount, selectedGiftAvailableStock]);

	const resetForm = () => {
		setId("");
		setName("");
		setAmount("");
	};

	const handleAddOrderGift = () => {
		addOrderGift({
			id: Number(id),
			name,
			amount: Number(amount || 0),
			quantity: Number(amount || 0),
		});
		resetForm();
	};

	const handleEditOrderGift = () => {
		if (!gift) return;
		editOrderGift({
			id: gift.id,
			name: gift.name,
			amount: Number(amount || 0),
			quantity: Number(amount || 0),
		});
		resetForm();
	};

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{gift ? "แก้ไข" : "เพิ่ม"} ของแถม
					</DialogTitle>

					<DialogDescription>
						<div className="mt-2 flex gap-4">
							{!gift && (
								<div>
									<Label>ชื่อของแถม</Label>
									<Select value={id} onValueChange={setId}>
										<SelectTrigger className="w-[180px]">
											<SelectValue placeholder="เลือกของแถม" />
										</SelectTrigger>
										<SelectContent>
											{allGifts.map(
												(g) =>
													!orderGiftsIds.includes(g.id) && (
														<SelectItem
															key={g.id}
															value={g.id.toString()}
														>
															{g.name}
														</SelectItem>
													)
											)}
										</SelectContent>
									</Select>
								</div>
							)}

							<div>
								<Label>จำนวน</Label>
								<Input
									type="number"
									value={amount}
									onFocus={() => amount === 0 && setAmount("")}
									onChange={(e) =>
										setAmount(
											e.target.value === ""
												? ""
												: Number(e.target.value)
										)
									}
								/>
								{selectedGiftAvailableStock !== undefined && (
									<span className="text-xs">
										คงเหลือ {selectedGiftAvailableStock}
									</span>
								)}
							</div>
						</div>
					</DialogDescription>
				</DialogHeader>

				<DialogFooter>
					{!canAddGift && id && (
						<span className="text-red-500 text-sm">
							จำนวนเกินสต็อก
						</span>
					)}
					<DialogClose asChild>
						<Button
							disabled={!canAddGift}
							onClick={gift ? handleEditOrderGift : handleAddOrderGift}
						>
							บันทึก
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default OrderGiftDialog;
