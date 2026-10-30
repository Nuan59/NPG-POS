export const dynamic = 'force-dynamic'
// page.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/tasks/page.tsx
// หน้านี้ตั้งใจแยกออกจาก /employees เพราะ middleware.ts บล็อก /employees สำหรับ
// พนักงานทั่วไป (role !== "adm") แบบ hard-block เสมอ ไม่ว่าจะตั้งสิทธิ์อะไรไว้ก็ตาม
// พนักงานเลยต้องมีหน้าของตัวเองที่เข้าถึงงานที่ถูกมอบหมายได้โดยไม่ผ่าน /employees
import { getEmployees } from "@/services/EmployeeService";
import TaskBoard from "../employees/components/TaskBoard";
import CashHandoverPanel from "./components/CashHandoverPanel";
import TaskCalendar from "./components/TaskCalendar";
import ExpenseRequestPanel from "./components/ExpenseRequestPanel";
import TaskCheckinOverview from "./components/TaskCheckinOverview";
import DailyNotesAdmin from "./components/DailyNotesAdmin";

const TasksPage = async () => {
  const employees = await getEmployees();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">งานของฉัน</h2>
      {/* ✅ adm / ผู้ตรวจสอบ: ใครเช็คอินงานแล้ว / งานค้าง / ติดปัญหา / ไม่อัปเดต (พนักงานไม่เห็นส่วนนี้) */}
      <TaskCheckinOverview />
      {/* ✅ adm / ผู้ตรวจสอบ: note ปิดร้านของทุกคน (ย้อนหลังได้) */}
      <DailyNotesAdmin />
      {/* ✅ ปฏิทินงาน - แต่ละคนเห็นเฉพาะงานของตัวเอง + ประกาศทั่วไปที่มีกำหนดวัน */}
      <TaskCalendar />
      {/* ✅ ส่งเงินสดให้ adm - พนักงานส่ง / adm กดรับ */}
      <CashHandoverPanel />
      {/* ✅ รายการจ่าย - พนักงานขอจ่าย / adm อนุมัติ → ลงรายจ่ายเงินสด */}
      <ExpenseRequestPanel />
      <TaskBoard employees={employees} />
    </div>
  );
};

export default TasksPage;