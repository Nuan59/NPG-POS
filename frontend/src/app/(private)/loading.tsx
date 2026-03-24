import { Loader2 } from "lucide-react";
import React from "react";

const Loading = () => {
	return (
		<div className="flex justify-center items-center w-full h-full">
			<Loader2 size={32} className="animate-spin" />
		</div>
	);
};

export default Loading;
