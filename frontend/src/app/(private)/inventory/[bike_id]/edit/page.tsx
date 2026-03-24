import React from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getBike } from "@/services/InventoryService";
import { Separator } from "@/components/ui/separator";
import BikeForm from "@/app/(private)/inventory/add/components/BikeForm";
import { getStorages } from "@/services/StorageService";
import Link from "next/link";

interface EditBikeParams {
	params: {
		bike_id: string;
	};
}

const EditBike = async ({ params }: EditBikeParams) => {
	const bike = await getBike(parseInt(params.bike_id));

	return (
		<>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/inventory">สินค้า</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={`/inventory/${bike.id}`}>{bike.model_name}</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Edit</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<Separator className="my-2" />

			<div className="py-2 grid grid-cols-2 place-content-start gap-x-5 h-full">
				<div className="col-span-2 max-h-[20%]">
					<h2 className="text-3xl font-semibold prompt">
						Edit product - {bike.model_name}
					</h2>
				</div>

				<BikeForm bike={bike} />
			</div>
		</>
	);
};

export default EditBike;
