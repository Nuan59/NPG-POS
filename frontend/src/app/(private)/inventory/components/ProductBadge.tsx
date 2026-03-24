import React from "react";

interface ProductBadgeProps {
	type: "available" | "sold" | "order";
}

const ProductBadge = ({ type }: ProductBadgeProps) => {
	const color = {
		available: "bg-emerald-400 text-emerald-900",
		sold: "bg-red-400 text-red-900",
		order: "bg-yellow-400 text-yellow-900",
	};

	const text = {
		available: "คงคลัง",
		sold: "ขายแล้ว",
		order: "กำลังขาย",
	};

	return (
		<span
			className={`${color[type]} text-xs font-bold me-2 px-2.5 py-0.5 rounded-full`}
		>
			{text[type]}
		</span>
	);
};

export default ProductBadge;
