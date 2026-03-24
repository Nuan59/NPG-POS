import { getStorages } from "@/services/StorageService";
import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbSeparator,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import React from "react";
import Link from "next/link";
import TransferForm from "./components/TransferForm";

const TransferStorage = async () => {
	const storages = await getStorages().then((res) => res?.json());
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
						<BreadcrumbPage>โอนสินค้า</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<Separator className="my-2" />

			<div className="py-2 grid grid-cols-1 place-content-start gap-x-5 h-full">
				<div className="col-span-2 flex justify-between">
					<h2 className="text-3xl font-semibold prompt">โอนสินค้า</h2>
				</div>
				<TransferForm storages={storages} />
			</div>
		</>
	);
};

export default TransferStorage;
