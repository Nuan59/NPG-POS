import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { getStorage } from "@/services/StorageService";
import { IStorage } from "@/types/Storage";
import { Separator } from "@/components/ui/separator";
import { ArrowLeftRight, Frown, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStorageBikes } from "@/services/InventoryService";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DataTable } from "@/components/ui/data-table";
import { BikeColumns } from "../../inventory/components/BikeColumn";
import { IBike } from "@/types/Bike";
import ProductBadge from "../../inventory/components/ProductBadge";
import ActionButtons from "./components/ActionButtons";

interface ViewStorageProps {
	params: {
		storage_id: string;
	};
}

const ViewStorage = async ({ params }: ViewStorageProps) => {
	const storage = (await getStorage(parseInt(params.storage_id)).then((res) => {
		if (!res?.ok) {
			return null;
		}
		return res.json();
	})) as IStorage;

	if (storage === null) {
		return (
			<div className="grid place-items-center h-full w-full">
				<div className="flex items-center justify-center flex-col gap-3">
					<Frown size={"6rem"} opacity={"60%"} />
					<h1>This storage was not found</h1>
					<Link href={"/storages"}>
						<Button>Back</Button>
					</Link>
				</div>
			</div>
		);
	}

	const storageBikes = await getStorageBikes(parseInt(params.storage_id));

	return (
		<>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/storage">สถานที่จัดเก็บ</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{storage.storage_name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<Separator className="my-2" />

			<div className="py-2 grid grid-cols-2 gap-x-5">
				<div className="col-span-2 flex justify-between">
					<h2 className="text-3xl font-semibold prompt">
						{storage.storage_name}
					</h2>
					<div className="flex items-end flex-col">
						<h3>{storage.address}</h3>
						<h3>{storage.phone}</h3>
					</div>
				</div>

				<div className="col-span-2 h-[570px]">
					<ScrollArea className="p-2 h-full">
						<Table>
							<TableCaption>
								Products in storage {storage.storage_name}
							</TableCaption>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[100px]">ยี่ห้อ</TableHead>
									<TableHead>ชื่อรุ่น</TableHead>
									<TableHead>รหัสรุ่น</TableHead>
									<TableHead className="text-right">เลขตัวเครื่อง</TableHead>
									<TableHead className="text-right">สถานะ</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{storageBikes.length > 0 ? (
									<>
										{storageBikes.map((bike: IBike) => (
											<TableRow key={bike.id}>
												<TableCell className="font-medium">
													{bike.brand}
												</TableCell>
												<TableCell>{bike.model_name}</TableCell>
												<TableCell>{bike.model_code}</TableCell>
												<TableCell className="text-right">
													{bike.engine}
												</TableCell>
												<TableCell className="text-right">
													<ProductBadge
														type={bike.sold ? "sold" : "available"}
													/>
												</TableCell>
											</TableRow>
										))}
									</>
								) : (
									<>
										<TableRow>
											<TableCell className="text-center" colSpan={6}>
												No products found in this storage
											</TableCell>
										</TableRow>
									</>
								)}
							</TableBody>
						</Table>
					</ScrollArea>
				</div>

				<ActionButtons storage={storage} />
			</div>
		</>
	);
};

export default ViewStorage;
