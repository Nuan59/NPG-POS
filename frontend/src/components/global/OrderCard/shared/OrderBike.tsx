import { IBike } from "@/types/Bike";
import { X } from "lucide-react";

interface OrderBikeProps {
  bike: IBike;
  onRemove: () => void;
}

const OrderBike = ({ bike, onRemove }: OrderBikeProps) => {
  return (
    <div className="shadow p-4 mt-3 rounded-lg bg-slate-700 text-slate-50 relative">
      <div className="flex justify-between items-start pr-10">
        <div className="flex flex-col">
          <span className="text-lg font-bold">{bike.model_name}</span>
          <span className="text-sm opacity-80">{bike.model_code}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-200 h-8 w-8 rounded-md flex items-center justify-center"
      >
        <X size={18} className="text-slate-900" />
      </button>
    </div>
  );
};

export default OrderBike;
