// EditForm.tsx
// วางไฟล์นี้ใน: src/app/(private)/sales/[sale_id]/edit/components/

"use client";

import { FormField } from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { editOrder } from "@/services/OrderService";
import { IOrder } from "@/types/Order";
import { getDate } from "@/util/GetDateString";
import { Plus, X, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ✅ Import components และ helpers จากไฟล์เดียวกัน
import { ImageUploadSection } from "./imageuploadsection";
import {
	handleImageUpload,
	handleRemoveNewImage,
	handleRemoveExistingImage,
} from "./imageHandlers";
import {
	calculateTotal,
	calculateFinanceAmount,
	calculateInstallmentAmount,
	isFinanceMethod,
} from "./calculations";

interface FormDataType {
	paymentMethod: string;
	notes: string;
	additionalFees: {
		id: number;
		description: string;
		amount?: number;
	}[];
	gifts: {
		id: number;
		name: string;
		quantity: number;
	}[];
	discount: number;
	downPayment: number;
	deposit: number;
	salePrice: number;
	financeAmount: number;
	interestRate: number;
	installmentCount: number;
	installmentAmount: number;
	npgPeriod?: string;
	registrationExpiryDate?: string;
}

interface EditFormProps {
	order: IOrder;
}

const EditForm = ({ order }: EditFormProps) => {
	const router = useRouter();

	// State สำหรับรูปภาพ
	const [images, setImages] = useState<File[]>([]);
	const [imagesPreviews, setImagesPreviews] = useState<string[]>([]);
	const [existingImages, setExistingImages] = useState<string[]>(
		order.images || []
	);

	const detectNpgPeriod = (): string => {
		if (order.payment_method !== "NPG") return "";
		if (order.installment_count && order.installment_count <= 10) {
			return "รายปี";
		}
		return "รายเดือน";
	};

	const { register, control, handleSubmit, getValues, watch, setValue } =
		useForm<FormDataType>({
			defaultValues: {
				paymentMethod: order.payment_method || "เงินสด",
				notes: order.notes || "",
				additionalFees: order.additional_fees?.map((f) => ({
					...f,
					amount: f.amount === 0 ? undefined : f.amount,
				})) || [],
				gifts: order.gifts?.map((g) => ({
					id: g.id,
					name: g.name,
					quantity: g.quantity,
				})) || [],
				discount: order.discount || 0,
				downPayment: order.down_payment || 0,
				deposit: order.deposit || 0,
				salePrice: Number(order.sale_price) || 0,
				financeAmount: Number(order.finance_amount) || 0,
				interestRate: Number(order.interest_rate) || 0,
				installmentCount: Number(order.installment_count) || 0,
				installmentAmount: Number(order.installment_amount) || 0,
				npgPeriod: detectNpgPeriod(),
				registrationExpiryDate: order.registration_expiry_date || "",
			},
		});

	const { fields: feeFields, append: appendFee, remove: removeFee } = 
		useFieldArray({ name: "additionalFees", control });

	const { fields: giftFields, append: appendGift, remove: removeGift } = 
		useFieldArray({ name: "gifts", control });

	const [total, setTotal] = useState<number>(0);

	const watchedFields = watch([
		"salePrice",
		"discount",
		"downPayment",
		"deposit",
		"paymentMethod",
		"financeAmount",
		"interestRate",
		"installmentCount",
		"npgPeriod",
	]);

	// ✅ แก้ไข infinite loop
	useEffect(() => {
		calculateTotal(getValues, setTotal);
	}, []);

	useEffect(() => {
		calculateFinanceAmount(getValues, setValue);
		calculateInstallmentAmount(getValues, setValue);
		calculateTotal(getValues, setTotal);
	}, [
		watchedFields[0],
		watchedFields[1],
		watchedFields[2],
		watchedFields[3],
		watchedFields[4],
		watchedFields[5],
		watchedFields[6],
		watchedFields[7],
		watchedFields[8],
	]);

	const submitForm = async (data: FormDataType) => {
		const isFinance = isFinanceMethod(data.paymentMethod);

		const payload = {
			...data,
			total,
			bikePrice: data.salePrice,
			finance_amount: isFinance ? data.financeAmount : 0,
			interest_rate: isFinance ? data.interestRate : 0,
			installment_count: isFinance ? data.installmentCount : 0,
			installment_amount: isFinance ? data.installmentAmount : 0,
			finance_provider:
				isFinance &&
				(data.paymentMethod === "Cathay" ||
					data.paymentMethod === "ทรัพย์สยาม" ||
					data.paymentMethod === "NPG")
					? data.paymentMethod
					: "",
			registration_expiry_date: data.registrationExpiryDate || null,
		};

		if (images.length === 0) {
			const edit = await editOrder(order.id, payload);

			if (edit.status === "success") {
				toast.success("แก้ไขรายการขายสำเร็จ", {
					description: getDate(new Date()),
				});
				router.push(`/sales/${order.id}`);
				return;
			}

			toast.error("เกิดข้อผิดพลาดในการแก้ไข");
			return;
		}

		toast.info("ฟีเจอร์อัปโหลดรูปยังไม่พร้อมใช้งาน");
	};

	const clearZeroOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
		if (e.target.value === "0") {
			e.target.value = "";
		}
	};

	const isFinance = isFinanceMethod(watch("paymentMethod"));
	const isNPG = watch("paymentMethod") === "NPG";

	return (
		<form id="editorder" onSubmit={handleSubmit(submitForm)}>
			{/* ส่วนอัปโหลดรูปภาพ */}
			<ImageUploadSection
				existingImages={existingImages}
				imagesPreviews={imagesPreviews}
				onImageUpload={(e) =>
					handleImageUpload(e, setImages, setImagesPreviews)
				}
				onRemoveExisting={(i) =>
					handleRemoveExistingImage(i, setExistingImages)
				}
				onRemoveNew={(i) =>
					handleRemoveNewImage(i, setImages, setImagesPreviews)
				}
			/>

			{/* วันหมดอายุทะเบียน */}
			<div className="p-4 bg-orange-50 rounded-lg border border-orange-200 mb-4">
				<Label
					htmlFor="registrationExpiryDate"
					className="flex items-center gap-2"
				>
					<Calendar size={16} className="text-orange-600" />
					วันหมดอายุทะเบียนรถ
				</Label>
				<Input
					type="date"
					id="registrationExpiryDate"
					{...register("registrationExpiryDate")}
					className="w-full mt-2"
				/>
				<p className="text-xs text-gray-500 mt-2">
					ระบบจะแจ้งเตือนก่อนหมดอายุ 1 เดือนและ 3 เดือน
				</p>
			</div>

			{/* ค่าใช้จ่ายเพิ่มเติม */}
			{feeFields.length > 0 && (
				<div className="p-2">
					<div className="flex items-center gap-2 mb-2">
						<span className="font-medium">ค่าใช้จ่ายเพิ่มเติม</span>
						<button
							type="button"
							onClick={() => {
								appendFee({
									id: Math.floor(Math.random() * 1000),
									description: "",
									amount: undefined,
								});
							}}
							className="border rounded bg-slate-300 p-1"
						>
							<Plus size={16} />
						</button>
					</div>

					<div className="max-h-32 overflow-y-auto mb-2">
						<div className="space-y-2">
							{feeFields.map((field, index) => (
								<div
									key={field.id}
									className="flex justify-between items-center bg-amber-50 p-2 rounded gap-2 border border-amber-200"
								>
									<input
										type="text"
										placeholder="รายการ"
										className="border-none text-xs p-2 bg-white rounded flex-1"
										{...register(`additionalFees.${index}.description`)}
									/>

									<input
										type="number"
										placeholder="0"
										min="0"
										onFocus={clearZeroOnFocus}
										className="border-none text-xs p-2 bg-slate-200 rounded w-[100px] text-right"
										{...register(`additionalFees.${index}.amount`, {
											onChange: () => calculateTotal(getValues, setTotal),
											valueAsNumber: true,
										})}
									/>

									<button
										type="button"
										onClick={() => {
											removeFee(index);
											setTimeout(() => calculateTotal(getValues, setTotal), 0);
										}}
										className="bg-red-400 hover:bg-red-500 rounded p-1"
									>
										<X size={16} />
									</button>
								</div>
							))}
						</div>
					</div>
				</div>
			)}

			{/* ของแถม */}
			{giftFields.length > 0 && (
				<div className="p-2">
					<div className="flex items-center gap-2 mb-2">
						<span className="font-medium">ของแถม</span>
						<button
							type="button"
							onClick={() => {
								appendGift({
									id: Math.floor(Math.random() * 1000),
									name: "",
									quantity: 1,
								});
							}}
							className="border rounded bg-slate-300 p-1"
						>
							<Plus size={16} />
						</button>
					</div>

					<div className="max-h-24 overflow-y-auto mb-2">
						{giftFields.map((field, index) => (
							<div
								key={field.id}
								className="flex justify-between items-center bg-green-50 p-2 rounded mb-2 gap-2 border border-green-200"
							>
								<input
									type="text"
									placeholder="ชื่อของแถม"
									className="border-none text-xs p-2 bg-white rounded flex-1"
									{...register(`gifts.${index}.name`)}
								/>

								<input
									type="number"
									placeholder="1"
									min="1"
									className="border-none text-xs p-2 bg-white rounded w-[70px] text-center"
									{...register(`gifts.${index}.quantity`, {
										valueAsNumber: true,
									})}
								/>

								<button
									type="button"
									onClick={() => removeGift(index)}
									className="bg-red-400 hover:bg-red-500 rounded p-1"
								>
									<X size={16} />
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ข้อมูลการขาย */}
			<div className="flex items-center justify-between p-2 bg-slate-50">
				<span className="font-semibold">ข้อมูลการขาย</span>
			</div>

			{/* วิธีชำระเงิน */}
			<div className="flex items-center justify-between p-2">
				<span>เงื่อนไขการชำระ</span>
				<FormField
					control={control}
					name="paymentMethod"
					render={({ field }) => (
						<Select
							onValueChange={(value) => {
								field.onChange(value);
								setTimeout(() => {
									calculateFinanceAmount(getValues, setValue);
									calculateInstallmentAmount(getValues, setValue);
									calculateTotal(getValues, setTotal);
								}, 0);
							}}
							defaultValue={field.value}
						>
							<SelectTrigger className="border-none text-xs p-2 w-[40%] bg-slate-200 rounded">
								<SelectValue placeholder={field.value} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="เงินสด">เงินสด</SelectItem>
								<SelectItem value="ไฟแนนซ์">ไฟแนนซ์</SelectItem>
								<SelectItem value="NPG">NPG</SelectItem>
								<SelectItem value="Cathay">Cathay</SelectItem>
								<SelectItem value="ทรัพย์สยาม">ทรัพย์สยาม</SelectItem>
							</SelectContent>
						</Select>
					)}
				/>
			</div>

			{/* NPG Period */}
			{isNPG && (
				<div className="flex items-center justify-between p-2">
					<span>รอบชำระ</span>
					<FormField
						control={control}
						name="npgPeriod"
						render={({ field }) => (
							<Select
								onValueChange={(value) => {
									field.onChange(value);
									setTimeout(
										() => calculateInstallmentAmount(getValues, setValue),
										0
									);
								}}
								value={field.value}
							>
								<SelectTrigger className="border-none text-xs p-2 w-[40%] bg-slate-200 rounded">
									<SelectValue placeholder="เลือกรอบชำระ" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="รายเดือน">รายเดือน</SelectItem>
									<SelectItem value="รายปี">รายปี</SelectItem>
								</SelectContent>
							</Select>
						)}
					/>
				</div>
			)}

			{/* ราคาสินค้า */}
			<div className="flex items-center justify-between p-2">
				<span>ราคาสินค้า</span>
				<input
					type="number"
					onFocus={clearZeroOnFocus}
					className="border-none text-xs p-2 bg-slate-200 rounded w-[40%] text-right"
					{...register("salePrice", {
						onChange: () => {
							calculateFinanceAmount(getValues, setValue);
							calculateTotal(getValues, setTotal);
						},
						valueAsNumber: true,
					})}
				/>
			</div>

			{/* มัดจำ */}
			<div className="flex items-center justify-between p-2">
				<span>มัดจำ</span>
				<input
					type="number"
					onFocus={clearZeroOnFocus}
					className="border-none text-xs p-2 bg-slate-200 rounded w-[40%] text-right"
					{...register("deposit", {
						onChange: () => calculateTotal(getValues, setTotal),
						valueAsNumber: true,
					})}
				/>
			</div>

			{/* ส่วนลด */}
			<div className="flex items-center justify-between p-2">
				<span>ส่วนลด</span>
				<input
					type="number"
					onFocus={clearZeroOnFocus}
					className="border-none text-xs p-2 bg-slate-200 rounded w-[40%] text-right"
					{...register("discount", {
						onChange: () => {
							calculateFinanceAmount(getValues, setValue);
							calculateTotal(getValues, setTotal);
						},
						valueAsNumber: true,
					})}
				/>
			</div>

			{/* เงินดาวน์ */}
			<div className="flex items-center justify-between p-2">
				<span>เงินดาวน์</span>
				<input
					type="number"
					onFocus={clearZeroOnFocus}
					className="border-none text-xs p-2 bg-slate-200 rounded w-[40%] text-right"
					{...register("downPayment", {
						onChange: () => {
							calculateFinanceAmount(getValues, setValue);
							calculateTotal(getValues, setTotal);
						},
						valueAsNumber: true,
					})}
				/>
			</div>

			{/* ถ้าเป็นไฟแนนซ์ */}
			{isFinance && (
				<>
					<div className="flex items-center justify-between p-2">
						<span>ยอดจัด</span>
						<input
							type="number"
							readOnly
							className="border-none text-xs p-2 bg-gray-100 rounded w-[40%] text-right cursor-not-allowed"
							{...register("financeAmount", { valueAsNumber: true })}
						/>
					</div>

					<div className="flex items-center justify-between p-2">
						<span>ดอกเบี้ย (%)</span>
						<input
							type="number"
							step="0.01"
							onFocus={clearZeroOnFocus}
							className="border-none text-xs p-2 bg-slate-200 rounded w-[40%] text-right"
							{...register("interestRate", {
								onChange: () => calculateInstallmentAmount(getValues, setValue),
								valueAsNumber: true,
							})}
						/>
					</div>

					<div className="flex items-center justify-between p-2">
						<span>
							{isNPG && watch("npgPeriod") === "รายปี"
								? "จำนวนงวด (ปี)"
								: "จำนวนงวด"}
						</span>
						<input
							type="number"
							onFocus={clearZeroOnFocus}
							className="border-none text-xs p-2 bg-slate-200 rounded w-[40%] text-right"
							{...register("installmentCount", {
								onChange: () => calculateInstallmentAmount(getValues, setValue),
								valueAsNumber: true,
							})}
						/>
					</div>

					<div className="flex items-center justify-between p-2">
						<span>
							{isNPG && watch("npgPeriod") === "รายปี"
								? "ค่างวด (ต่อปี)"
								: "ค่างวด"}
						</span>
						<input
							type="number"
							readOnly
							className="border-none text-xs p-2 bg-gray-100 rounded w-[40%] text-right cursor-not-allowed"
							{...register("installmentAmount", { valueAsNumber: true })}
						/>
					</div>
				</>
			)}

			{/* หมายเหตุ */}
			<div className="flex items-center justify-between p-2">
				<span>หมายเหตุ</span>
				<input
					type="text"
					className="border-none text-xs p-2 bg-slate-200 rounded w-[60%]"
					{...register("notes")}
				/>
			</div>

			<hr className="my-3" />

			{/* ยอดรวม */}
			<div className="flex justify-between p-2 font-bold bg-blue-50">
				<span>ยอดรวมชำระทั้งหมด</span>
				<span className="text-blue-600">{total.toLocaleString()} บาท</span>
			</div>
		</form>
	);
};

export default EditForm;