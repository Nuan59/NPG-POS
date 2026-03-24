"use client";

import * as React from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ICustomer } from "@/types/Customer";
import { getCustomers } from "@/services/CustomerService";

interface SelectCustomerProps {
	value: string;
	setValue: React.Dispatch<React.SetStateAction<string>>;
}

export function SelectCustomer({ value, setValue }: SelectCustomerProps) {
	const [open, setOpen] = React.useState(false);
	const [customers, setCustomers] = React.useState<
		{
			value: string;
			label: string;
		}[]
	>([]);

	const fetchCustomers = async () => {
		const cust = await getCustomers();

		if (cust) {
			setCustomers(() => {
				const data = cust.map((c: ICustomer) => {
					return { value: `${c.id}`, label: c.name };
				});

				return data;
			});
		}
	};

	React.useEffect(() => {
		fetchCustomers();
	}, []);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-[200px] flex justify-between items-center"
				>
					<User size={"1.3rem"} opacity={"60%"} />
					{value
						? customers.find((customer) => customer.value === value)?.label
						: "เลือกลูกค้า"}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder="Search customer..." />
					<CommandEmpty>No customer found.</CommandEmpty>
					<CommandGroup>
						{customers.map((customer) => (
							<CommandItem
								key={customer.value}
								value={customer.value}
								onSelect={(currentValue) => {
									setValue(currentValue === value ? "" : currentValue);
									setOpen(false);
								}}
							>
								<Check
									className={cn(
										"mr-2 h-4 w-4",
										value === customer.value ? "opacity-100" : "opacity-0"
									)}
								/>
								{customer.label}
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
