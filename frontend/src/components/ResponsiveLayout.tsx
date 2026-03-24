"use client";

import React, { useState } from "react";
import OrderCard from "@/components/global/OrderCard";
import { Menu, X, ShoppingCart } from "lucide-react";

export default function ResponsiveLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [showOrderCard, setShowOrderCard] = useState(false);

	return (
		<main className="relative">
			{/* Desktop Layout: 2 columns */}
			<div className="hidden lg:grid lg:grid-cols-[3fr_1fr] text-slate-900 gap-4 p-4">
				{/* Left: Main Content */}
				<section className="bg-slate-50 font-bold p-6 xl:p-10 rounded-xl overflow-auto min-h-[calc(100vh-120px)] max-h-[calc(100vh-120px)]">
					{children}
				</section>

				{/* Right: Order Card - Desktop only */}
				<aside className="sticky top-4 h-fit">
					<OrderCard />
				</aside>
			</div>

			{/* Mobile/Tablet Layout: 1 column */}
			<div className="lg:hidden p-4">
				{/* Main Content */}
				<section className="bg-slate-50 font-bold p-4 md:p-6 rounded-xl mb-4 min-h-[calc(100vh-150px)]">
					{children}
				</section>

				{/* Floating Order Button - Mobile/Tablet only */}
				<button
					onClick={() => setShowOrderCard(true)}
					className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-40 flex items-center justify-center"
					aria-label="ดูตะกร้า"
				>
					<ShoppingCart size={24} />
					{/* Badge - แสดงจำนวนสินค้า (ถ้ามี) */}
					<span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
						0
					</span>
				</button>

				{/* Order Card Modal - Mobile/Tablet */}
				{showOrderCard && (
					<>
						{/* Backdrop */}
						<div
							className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
							onClick={() => setShowOrderCard(false)}
						/>

						{/* Sidebar */}
						<div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl overflow-auto z-50 lg:hidden animate-slide-in-right">
							{/* Header */}
							<div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
								<h2 className="text-lg font-bold">สรุปรายการขาย</h2>
								<button
									onClick={() => setShowOrderCard(false)}
									className="p-2 hover:bg-gray-100 rounded-full transition-colors"
									aria-label="ปิด"
								>
									<X size={24} />
								</button>
							</div>

							{/* Order Card Content */}
							<div className="p-4">
								<OrderCard />
							</div>
						</div>
					</>
				)}
			</div>
		</main>
	);
}