"use client";
import { Label } from "@/components/ui/label";
import { getStorageBikes } from "@/services/InventoryService";
import { transferProducts } from "@/services/StorageService";
import { IBike } from "@/types/Bike";
import { IStorage } from "@/types/Storage";
import { getDate } from "@/util/GetDateString";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface TransferFormProps {
	storages: IStorage[];
}

type BikesCheckbox = {
	checked: boolean;
	bike: IBike;
};

const TransferForm = ({ storages }: TransferFormProps) => {
	const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
	const [destinationStorage, setDestinationStorage] = useState<string | null>(
		null
	);
	const [checkboxSelected, setCheckboxSelected] = useState<BikesCheckbox[]>([]);

	const fetchStorageBikes = async () => {
		if (selectedStorage) {
			const checkboxes = [] as BikesCheckbox[];
			const bikes = await getStorageBikes(parseInt(selectedStorage));
			bikes.map((bike: IBike) => {
				checkboxes.push({
					checked: false,
					bike,
				});
			});

			setCheckboxSelected(checkboxes);
		}
	};

	const handleSelectBike = (position: number) => {
		let newState = [] as BikesCheckbox[];
		checkboxSelected.map(({ bike, checked }, index) => {
			if (position === index) {
				newState.push({ checked: !checked, bike });
			} else {
				newState.push({ checked, bike });
			}
		});

		setCheckboxSelected(newState);
	};

	const router = useRouter();

	const handleSubmit = () => {
		if (!destinationStorage || !selectedStorage) {
			toast.info("กรุณาเลือกสถานที่จัดเก็บปลายทาง");
			return;
		}

		let selectedBikes = [] as number[];
		checkboxSelected.map(({ bike, checked }) => {
			if (checked) {
				selectedBikes.push(bike.id);
			}
		});
		const payload = {
			origin: parseInt(selectedStorage),
			destination: parseInt(destinationStorage),
			bikes: selectedBikes,
		};

		transferProducts(payload).then(async (res) => {
			if (res.status === "success") {
				toast.success("โอนสินค้าเรียบร้อยแล้ว", {
					description: getDate(new Date()),
				});
				setDestinationStorage(null);
				setSelectedStorage(null);

				const data = await res.data;

				router.push(`/storage/transfer/receipt/${data.data}`);
			} else {
				const error = await res.data;
				Object.keys(error).map((key) => {
					toast.error(`${key}: ${error[key][0]}`);
				});
			}
		});
	};

	useEffect(() => {
		fetchStorageBikes();
	}, [selectedStorage]);

	const [filterTerm, setFilterTerm] = useState<string>("");

	const containsFilter = (bike: IBike) => {
		for (const [_, value] of Object.entries(bike)) {
			if (String(value).toLowerCase().includes(filterTerm.toLowerCase())) {
				return true;
			}
		}
		return false;
	};

	return (
		<div className="container mt-5">
			<div className="flex justify-between items-center">
				<Label htmlFor="selectfrom">โอนจากสถานที่จัดเก็บ</Label>
				<Select onValueChange={(value) => setSelectedStorage(value)}>
					<SelectTrigger className="w-[80%]">
						<SelectValue placeholder="เลือกสถานที่จัดเก็บ" />
					</SelectTrigger>
					<SelectContent>
						{storages.map((storage) => (
							//@ts-expect-error
							<SelectItem key={storage.id} value={storage.id}>
								{storage.storage_name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{selectedStorage && (
				<div className="flex items-center flex-col">
					<div className="mt-5 flex justify-between items-center gap-2 place-self-end">
						<Label htmlFor="filter">ค้นหา</Label>
						<Input
							placeholder="ค้นหาจากรุ่น / ยี่ห้อ / รหัส / เครื่องยนต์"
							value={filterTerm}
							onChange={(e) => setFilterTerm(e.target.value)}
						/>
					</div>

					{checkboxSelected.length > 0 ? (
						<>
							<div className="mt-5 w-full overflow-y-auto max-h-72 min-h-72">
								<div className="grid grid-cols-4 bg-white sticky top-0 pl-8 border-b font-bold mb-3">
									<span>รุ่น</span>
									<span>ยี่ห้อ</span>
									<span>รหัสรุ่น</span>
									<span>เครื่องยนต์</span>
								</div>

								{checkboxSelected.map(({ checked, bike }, index) => (
									<>
										{containsFilter(bike) && (
											<div
												className="flex w-full gap-2 hover:bg-slate-100 border-b p-2 rounded justify-between items-center"
												key={index}
											>
												<input
													id={`bikes-${index}`}
													checked={checked}
													name={`${bike.id}`}
													value={bike.id}
													onChange={() => handleSelectBike(index)}
													type="checkbox"
												/>
												<label
													className="w-full grid grid-cols-4"
													htmlFor={`bikes-${index}`}
												>
													<span>{bike.model_name}</span>
													<span>{bike.brand}</span>
													<span>{bike.model_code}</span>
													<span>{bike.engine}</span>
												</label>
											</div>
										)}
									</>
								))}
							</div>

							<div className="flex justify-between w-full mt-5 items-center">
								<Label htmlFor="select-storage">
									โอนไปยังสถานที่จัดเก็บ
								</Label>
								<Select onValueChange={(value) => setDestinationStorage(value)}>
									<SelectTrigger className="w-[80%]">
										<SelectValue placeholder="เลือกสถานที่จัดเก็บปลายทาง" />
									</SelectTrigger>
									<SelectContent>
										{storages.map((storage) => (
											<>
												{storage.id !== parseInt(selectedStorage) && (
													//@ts-expect-error
													<SelectItem key={storage.id} value={storage.id}>
														{storage.storage_name}
													</SelectItem>
												)}
											</>
										))}
									</SelectContent>
								</Select>
							</div>
						</>
					) : (
						<span className="mt-10">
							ไม่พบสินค้าในสถานที่จัดเก็บนี้
						</span>
					)}
				</div>
			)}

			{selectedStorage && (
				<div className="flex mt-5 justify-between">
					<Link href={"/storage"}>
						<Button variant={"outline"}>ยกเลิก</Button>
					</Link>
					<Button onClick={handleSubmit}>โอนสินค้า</Button>
				</div>
			)}
		</div>
	);
};

export default TransferForm;
