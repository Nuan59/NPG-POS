export const dynamic = 'force-dynamic'
// page.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/tasks/page.tsx
// หน้านี้ตั้งใจแยกออกจาก /employees เพราะ middleware.ts บล็อก /employees สำหรับ
// พนักงานทั่วไป (role !== "adm") แบบ hard-block เสมอ ไม่ว่าจะตั้งสิทธิ์อะไรไว้ก็ตาม
// พนักงานเลยต้องมีหน้าของตัวเองที่เข้าถึงงานที่ถูกมอบหมายได้โดยไม่ผ่าน /employees
import { getEmployees } from "@/services/EmployeeService";
import TaskBoard from "../employees/components/TaskBoard";

const TasksPage = async () => {
  const employees = await getEmployees();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">งานของฉัน</h2>
      <TaskBoard employees={employees} />
    </div>
  );
};

export default TasksPage;