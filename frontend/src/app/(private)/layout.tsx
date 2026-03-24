import React from "react";

import { Navbar } from "@/components/global/Navbar";
import { Prompt } from "next/font/google";
import OrderCard from "@/components/global/OrderCard";
import OrderProvider from "@/context/OrderContext";
const prompt = Prompt({ weight: "100", subsets: ["latin", "thai"] });

export default function PrivateLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<>
			<OrderProvider>
				<div className={`h-[calc(100%-96px)] bg-slate-200 ${prompt.className}`}>
					<Navbar />
					<main className="grid grid-cols-[3fr_1fr] text-slate-900 gap-0 mt-0">
						<section className="m-10 bg-slate-50 font-bold p-10 h-[80vh] rounded-xl pt-5">
							{children}
						</section>
						<aside>
							<OrderCard />
						</aside>
					</main>
				</div>
			</OrderProvider>
		</>
	);
}
