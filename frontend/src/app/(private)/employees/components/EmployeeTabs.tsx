"use client";
// ✅ แท็บของเมนูพนักงาน - ใช้ร่วมกันทุกหน้าในเมนูนี้ (หาบันทึกการทำงานเจอง่าย)
import Link from "next/link";
import { CheckCircle2, ClipboardList, History, Users } from "lucide-react";

export type EmployeeTab = "staff" | "tasks" | "done" | "activity";

const TABS: { id: EmployeeTab; label: string; href: string; icon: typeof Users }[] = [
  { id: "staff", label: "พนักงาน", href: "/employees", icon: Users },
  { id: "tasks", label: "งาน", href: "/employees?tab=tasks", icon: ClipboardList },
  { id: "done", label: "เสร็จแล้ว", href: "/employees?tab=done", icon: CheckCircle2 },
  { id: "activity", label: "บันทึกการทำงาน", href: "/employees/activity", icon: History },
];

export default function EmployeeTabs({ active }: { active: EmployeeTab }) {
  return (
    <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
            active === t.id ? "border-[#F26B1D] text-[#F26B1D]" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <t.icon className="h-4 w-4" /> {t.label}
        </Link>
      ))}
    </div>
  );
}
