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
import { deleteCustomer } from "@/services/CustomerService";
import { ICustomer } from "@/types/Customer";
import { getDate } from "@/util/GetDateString";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

interface DeleteCustomerDialogProps {
	customer: ICustomer;
	children: React.ReactNode;
}

const DeleteCustomerDialog = ({
	customer,
	children,
}: DeleteCustomerDialogProps) => {
	const router = useRouter();

	const handleDeleteCustomer = async () => {
		const del = await deleteCustomer(customer.id);

		if (del) {
			router.push("/customers");
			toast(`Customer ${customer.name} has been deleted`, {
				description: getDate(new Date()),
			});
		}
	};

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Confirm delete customer {customer.name}?</DialogTitle>
				</DialogHeader>
				<DialogFooter className="sm:justify-between">
					<DialogClose asChild>
						<Button variant="secondary">Cancel</Button>
					</DialogClose>
					<Button
						onClick={handleDeleteCustomer}
						className="flex items-center gap-2"
						variant={"destructive"}
					>
						<Trash2 size={"1rem"} opacity={"60%"} />
						Yes, delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default DeleteCustomerDialog;
