import React from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import StorageForm from "../../new/components/StorageForm";
import { getStorage } from "@/services/StorageService";
import Link from "next/link";

interface EditStorageParams {
	params: {
		storage_id: string;
	};
}

const EditStorage = async ({ params }: EditStorageParams) => {
	const storage = await getStorage(parseInt(params.storage_id)).then((res) =>
		res?.json()
	);

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
						<BreadcrumbLink asChild>
							<Link href={`/storage/${params.storage_id}`}>
								{storage.storage_name}
							</Link>
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
						Edit storage - {storage.storage_name}
					</h2>
				</div>

				<StorageForm storage={storage} />
			</div>
		</>
	);
};

export default EditStorage;
