import React from "react";
import { Skeleton } from "../ui/skeleton";
import { Separator } from "../ui/separator";

const TableLoading = () => {
	return (
		<div className="flex flex-col gap-5 py-3">
			{Array.from({ length: 7 }).map((_, index) => (
				<>
					<Skeleton key={index} className="h-10 w-full" />
					<Separator />
				</>
			))}
		</div>
	);
};

export default TableLoading;
