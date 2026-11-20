import { encodePrice, isValidEncodedPrice } from "@/services/PriceDecoder";

/**
 * ✅ โค้ดทุน (ใช้เฉพาะกับทุน) - N=1 C=2 I=3 O=4 W=5 M=6 A=7 E=8 Z=9 T=0
 * คนขายอ่านออก ลูกค้าอ่านไม่ออก / ถ้าเก็บเป็นตัวเลขไว้ แปลงเป็นโค้ดก่อนแสดง (ไม่โชว์ตัวเลขทุน)
 */
export const toCostCode = (raw: unknown): string => {
  const text = String(raw ?? "").trim().toUpperCase();
  if (!text) return "";
  if (/^\d+(\.\d+)?$/.test(text)) return encodePrice(Math.round(Number(text)));
  return isValidEncodedPrice(text) ? text : "";
};

export const CostCodeBadge = ({ value, dark = false }: { value: unknown; dark?: boolean }) => {
  const code = toCostCode(value);
  if (!code) return null;
  return (
    <span
      title="โค้ดทุน"
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-px font-mono text-[11px] tracking-wider ${
        dark ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 border border-slate-200"
      }`}
    >
      <span className="font-sans tracking-normal opacity-70">ทุน</span>
      {code}
    </span>
  );
};
