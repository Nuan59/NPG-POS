"use client";
import React from "react";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { IBike } from "@/types/Bike";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";

const PriceInformation = ({ bike }: { bike: IBike }) => {
	const { data: session } = useSession();
	const userInfo = session?.user;

	return (
		<div>
			<h4 className="text-lg">Price information</h4>
			<Table>
				<TableBody>
					<TableRow>
						<TableCell className="font-medium">Sale price</TableCell>
						<TableCell>{bike.sale_price}</TableCell>
					</TableRow>

					{userInfo?.role === "adm" && (
						<>
							<TableRow>
								<TableCell className="font-medium">Wholesale price</TableCell>
								<TableCell>{bike.wholesale_price}</TableCell>
							</TableRow>

							<TableRow>
								<TableCell className="font-medium">
									Wholesale price NET
								</TableCell>
								<TableCell>{bike.wholesale_price_net}</TableCell>
							</TableRow>
						</>
					)}
				</TableBody>
			</Table>
			<Separator className="my-5" />
		</div>
	);
};

export default PriceInformation;
