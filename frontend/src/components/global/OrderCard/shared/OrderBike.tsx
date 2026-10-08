import { IBike } from "@/types/Bike";
import { X } from "lucide-react";

interface OrderBikeProps {
  bike: IBike;
  onRemove: () => void;
}

/** การ์ดรถที่เลือก - พื้นกรม แถบส้มเฉียง (เข้าชุดกับ navbar) */
const OrderBike = ({ bike, onRemove }: OrderBikeProps) => {
  const plate = (bike as any).registration_plate;
  const color = (bike as any).color;
  const sub = [plate, bike.model_code, color ? `สี${color}` : ""].filter(Boolean).join(" · ");

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#1e2432] text-white pl-4 pr-3 py-3.5 flex items-center">
      <div className="absolute top-0 bottom-0 -right-6 w-16 bg-orange-500 -skew-x-[18deg]" />
      <div className="min-w-0 pr-3">
        <p className="text-[17px] font-bold leading-tight truncate">{bike.model_name}</p>
        {sub && <p className="text-xs text-slate-200 truncate">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="relative z-10 ml-auto shrink-0 h-8 w-8 rounded-lg bg-white/95 text-[#1e2432] grid place-items-center hover:bg-white"
        title="เอารถออก"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default OrderBike;