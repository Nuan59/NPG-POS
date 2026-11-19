// ✅ แผนภาพในคู่มือ - วาดด้วย SVG (คมชัดทุกขนาดจอ พิมพ์ออกมาก็ชัด)
const INK = "#1e2432";
const QUIET = "#64748b";
const EDGE = "#94a3b8";
const ORANGE = "#F26B1D";

const Arrow = ({ id }: { id: string }) => (
  <defs>
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0L10 5L0 10z" fill={EDGE} />
    </marker>
  </defs>
);

const Box = ({ cx, cy, w, h = 44, label, sub, strong = false }: {
  cx: number; cy: number; w: number; h?: number; label: string; sub?: string; strong?: boolean;
}) => (
  <g>
    <rect
      x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx="10"
      fill={strong ? "#FFF1E8" : "#ffffff"} stroke={strong ? ORANGE : EDGE} strokeWidth={strong ? 2 : 1.25}
    />
    <text x={cx} y={sub ? cy - 2 : cy + 5} textAnchor="middle" fontSize="14" fontWeight={strong ? 700 : 600} fill={INK}>{label}</text>
    {sub && <text x={cx} y={cy + 15} textAnchor="middle" fontSize="11.5" fill={QUIET}>{sub}</text>}
  </g>
);

/** เงินที่รับไปที่ไหน: ขาย / บริการ / NPG → รายรับอัตโนมัติ → เงินสด (ส่ง adm) / โอน */
export const CashflowDiagram = () => {
  const ya = 70, yb = 130, yc = 190;
  return (
    <svg viewBox="0 0 760 250" role="img" aria-label="เงินที่รับลงรายรับให้เอง เงินสดต้องส่งให้ adm" className="w-full h-auto">
      <Arrow id="m-cash" />
      <g fill="none" stroke={EDGE} strokeWidth="1.5">
        <path d={`M190 ${ya}H218V${yb}H245`} markerEnd="url(#m-cash)" />
        <path d={`M190 ${yb}H245`} />
        <path d={`M190 ${yc}H218V${yb}`} />
        <path d={`M415 ${yb}H428V${ya}H440`} markerEnd="url(#m-cash)" />
        <path d={`M428 ${yb}V${yc}H440`} markerEnd="url(#m-cash)" />
        <path d={`M600 ${ya}H625`} markerEnd="url(#m-cash)" />
      </g>
      <Box cx={110} cy={ya} w={160} label="ขายรถ" />
      <Box cx={110} cy={yb} w={160} label="งานบริการ" />
      <Box cx={110} cy={yc} w={160} label="ค่างวด NPG" />
      <Box cx={330} cy={yb} w={170} label="รายรับอัตโนมัติ" strong />
      <Box cx={520} cy={ya} w={160} label="เงินสด" sub="ลิ้นชัก · ยกยอดทุกวัน" />
      <Box cx={520} cy={yc} w={160} label="โอน" sub="เริ่ม 0 ทุกวัน" />
      <Box cx={685} cy={ya} w={110} label="ส่งให้ adm" />
      <text x="24" y="238" fontSize="12" fill={QUIET}>เช็คไม่ลงรายรับ (ยังไม่ใช่เงินเข้าวันนั้น) · แบ่งจ่ายแยกลงทั้งสองส่วน</text>
    </svg>
  );
};

/** ขั้นตอนการขาย: ทำรายการ → รอจบ (เอกสาร + เช็คลิสต์) → จบรายการ → ผลที่เกิด */
export const SaleDiagram = () => {
  const y = 70;
  return (
    <svg viewBox="0 0 760 200" role="img" aria-label="ทำรายการแล้วกดจบรายการ ระบบตัดสต็อกและสร้างบัญชี NPG" className="w-full h-auto">
      <Arrow id="m-sale" />
      <g fill="none" stroke={EDGE} strokeWidth="1.5">
        <path d={`M184 ${y}H226`} markerEnd="url(#m-sale)" />
        <path d={`M406 ${y}H448`} markerEnd="url(#m-sale)" />
        <path d={`M538 ${y + 22}V120H${110}V138`} markerEnd="url(#m-sale)" />
        <path d={`M538 120H380V138`} markerEnd="url(#m-sale)" />
        <path d={`M538 120H650V138`} markerEnd="url(#m-sale)" />
      </g>
      <Box cx={104} cy={y} w={160} label="1. ทำรายการ" sub="รับเงิน · รายรับลงทันที" />
      <Box cx={316} cy={y} w={180} label="2. รอจบ" sub="พิมพ์เอกสาร · เช็คลิสต์" />
      <Box cx={538} cy={y} w={180} label="3. จบรายการ" strong />
      <Box cx={110} cy={160} w={190} label="รถออกจากสต็อก" />
      <Box cx={380} cy={160} w={190} label="นับเป็นยอดขาย" />
      <Box cx={650} cy={160} w={190} label="บัญชี NPG / ผ่อนดาวน์" />
    </svg>
  );
};
