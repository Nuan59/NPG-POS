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
import { deleteStorage } from "@/services/StorageService";
import { IStorage } from "@/types/Storage";
import { getDate } from "@/util/GetDateString";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";

interface DeleteStorageDialogProps {
	storage: IStorage;
	children: React.ReactNode;
}

const DeleteStorageDialog = ({
	storage,
	children,
}: DeleteStorageDialogProps) => {
	const router = useRouter();

	const handleDeleteStorage = async () => {
		const del = await deleteStorage(storage.id);

		if (del) {
			router.push("/storage");
			toast(`Storage ${storage.storage_name} has been deleted`, {
				description: getDate(new Date()),
			});
			return;
		}

		toast.error(`Storage not empty!`, {
			description: "Transfer products form this storage before deleting it.",
		});
	};

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						Confirm delete storage {storage.storage_name}?
					</DialogTitle>
				</DialogHeader>
				<DialogFooter className="sm:justify-between">
					<DialogClose asChild>
						<Button variant="secondary">Cancel</Button>
					</DialogClose>
					<Button
						onClick={handleDeleteStorage}
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

export default DeleteStorageDialog;
