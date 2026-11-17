// CashflowSaveStatus.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashflowSaveStatus.tsx
"use client";

interface CashflowSaveStatusProps {
  currentUserName: string;
  isAdmin: boolean;
  saving: boolean;
  lastSavedAt: Date | null;
}

// ✅ Auto-save แล้ว ไม่ต้องกดปุ่มบันทึกเองอีกต่อไป (เฉพาะ admin เท่านั้นที่แก้ไขได้)
// โชว์สถานะแทนปุ่ม ให้รู้ว่าระบบบันทึกให้เรียบร้อยแล้วหรือกำลังบันทึกอยู่
const CashflowSaveStatus = ({ currentUserName, isAdmin, saving, lastSavedAt }: CashflowSaveStatusProps) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center justify-between flex-wrap gap-3">
      <div className="text-sm text-[#7A7A7A]">
        ผู้เช็คเงิน: <span className="font-semibold text-[#1e2432]">{currentUserName || "-"}</span>
      </div>
      {isAdmin && (
        <div className="text-sm flex items-center gap-1.5">
          {saving ? (
            <span className="text-[#F26B1D] font-medium">💾 กำลังบันทึก...</span>
          ) : lastSavedAt ? (
            <span className="text-emerald-600 font-medium">
              ✓ บันทึกอัตโนมัติแล้ว เมื่อ {lastSavedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span className="text-slate-400">แก้ไขแล้วจะบันทึกให้อัตโนมัติ</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CashflowSaveStatus;