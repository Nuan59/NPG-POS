"use client";
// DutyTodayCard.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/DutyTodayCard.tsx
// การ์ด "เวรวันนี้" บนหน้าหลัก - ทุกคนเห็น / ถ้าวันนี้เป็นเวรของเรา ขึ้นเด่นสีส้ม
// เวร = โพสต์มอบหมายงานที่ขึ้นต้นด้วย "[เวร] " (ลงจากปุ่ม "📅 เวร" ในหน้าโพสต์งาน)
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { UserCheck, ChevronRight } from "lucide-react";
import { getTaskPosts } from "@/services/TaskService";

const DUTY_PREFIX = "[เวร]";

interface Duty {
  name: string;
  users: { username: string; name: string }[];
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const DutyTodayCard = () => {
  const { data: session, status } = useSession();
  const me = (session?.user as any)?.username;
  const [duties, setDuties] = useState<Duty[] | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    getTaskPosts()
      .then((posts) => {
        const today = new Date();
        const list: Duty[] = [];
        for (const p of Array.isArray(posts) ? posts : []) {
          if (!(p.content || "").startsWith(DUTY_PREFIX)) continue;
          const name = p.content.slice(DUTY_PREFIX.length).trim() || "เวร";
          for (const a of p.assignments || []) {
            if (!a.due_date || !sameDay(new Date(a.due_date), today)) continue;
            let d = list.find((x) => x.name === name);
            if (!d) {
              d = { name, users: [] };
              list.push(d);
            }
            if (!d.users.some((u) => u.username === a.employee_username))
              d.users.push({ username: a.employee_username, name: a.employee_name });
          }
        }
        setDuties(list);
      })
      .catch(() => setDuties([]));
  }, [status]);

  if (!duties || duties.length === 0) return null;

  const mine = duties.filter((d) => d.users.some((u) => u.username === me));

  return (
    <Link href="/tasks" className="block mt-4">
      <div
        className={`rounded-2xl p-4 sm:p-5 transition-shadow hover:shadow-lg ${
          mine.length ? "bg-[#F26B1D] text-white" : "bg-white border border-gray-200 text-[#1e2432]"
        }`}
      >
        <div className="flex items-center gap-2">
          <UserCheck size={20} className={mine.length ? "text-white" : "text-[#F26B1D]"} />
          <h3 className="font-bold text-base sm:text-lg">
            {mine.length ? `วันนี้คุณมีเวร${mine.map((d) => d.name).join(" / ")}` : "เวรวันนี้"}
          </h3>
          <ChevronRight size={18} className={`ml-auto ${mine.length ? "text-white/80" : "text-[#7A7A7A]"}`} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {duties.map((d) => (
            <div key={d.name} className={`rounded-xl px-3 py-2 ${mine.length ? "bg-white/15" : "bg-gray-50"}`}>
              <p className={`text-xs ${mine.length ? "text-white/80" : "text-[#7A7A7A]"}`}>เวร{d.name}</p>
              <p className="text-base font-semibold truncate">{d.users.map((u) => u.name).join(", ")}</p>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default DutyTodayCard;