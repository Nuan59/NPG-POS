export const dynamic = 'force-dynamic'

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
import CustomerForm from "../../new/components/CustomerForm";
import { getCustomer } from "@/services/CustomerService";
import Link from "next/link";

interface EditCustomerParams {
	params: {
		customer_id: string;
	};
}

const EditCustomer = async ({ params }: EditCustomerParams) => {
	const response = await getCustomer(parseInt(params.customer_id));
	
	if (!response?.ok) {
		return (
			<div className="p-4">
				<h2 className="text-xl font-semibold text-red-600">ไม่พบข้อมูลลูกค้า</h2>
				<p className="text-sm mt-2">ID: {params.customer_id}</p>
			</div>
		);
	}

	const customer = response.data;

	return (
		<>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/customers">ลูกค้า</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={`/customers/${customer.id}`}>{customer.name}</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>แก้ไข</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<Separator className="my-4" />

			{/* Card แบบเดียวกับหน้า new */}
			<div className="w-full rounded-xl bg-white p-6 shadow-sm">
				<h2 className="text-3xl font-semibold mb-6">
					แก้ไขข้อมูลลูกค้า - {customer.name}
				</h2>
				<CustomerForm customer={customer} />
			</div>
		</>
	);
};

export default EditCustomer;