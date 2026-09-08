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
    <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between flex-wrap gap-3">
      <div className="text-sm text-gray-600">
        ผู้เช็คเงิน: <span className="font-semibold text-gray-800">{currentUserName || "-"}</span>
      </div>
      {isAdmin && (
        <div className="text-sm flex items-center gap-1.5">
          {saving ? (
            <span className="text-orange-600 font-medium">💾 กำลังบันทึก...</span>
          ) : lastSavedAt ? (
            <span className="text-emerald-600 font-medium">
              ✓ บันทึกอัตโนมัติแล้ว เมื่อ {lastSavedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span className="text-gray-400">แก้ไขแล้วจะบันทึกให้อัตโนมัติ</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CashflowSaveStatus;