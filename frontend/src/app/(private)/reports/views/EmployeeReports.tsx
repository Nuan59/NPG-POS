// EmployeeReports.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/views/EmployeeReports.tsx
// ✅ รายงานพนักงาน (adm เท่านั้น) - ดึงครั้งเดียวต่อช่วงวันที่ เลือกพนักงานกรองฝั่ง client
"use client";

import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { useSession } from "next-auth/react";
import { Printer, X, AlertTriangle } from "lucide-react";
import { MONTHS } from "../util/index";
import {
  EmployeeReportData,
  EmployeeRow,
  PeriodMode,
  TASK_STATUS_LABEL,
  fetchEmployeeReport,
  isoDate,
  money,
  onTimePct,
  periodLabel,
  periodRange,
  thDate,
} from "../util/employeeTypes";

const th = "px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap";
const thR = th + " text-right";
const td = "px-3 py-2 whitespace-nowrap";
const tdR = td + " text-right tabular-nums";

const Badge = ({ tone, children }: { tone: "red" | "amber" | "green" | "blue" | "gray"; children: React.ReactNode }) => {
  const cls = {
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    gray: "bg-gray-100 text-gray-600",
  }[tone];
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
};

const Metric = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) => (
  <div className="rounded-lg bg-gray-50 px-4 py-3">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-xl font-semibold tabular-nums">{value}</div>
    {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
  </div>
);

const EmployeeReports = () => {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;

  const now = new Date();
  const [mode, setMode] = useState<PeriodMode>("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rangeStart, setRangeStart] = useState(isoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [rangeEnd, setRangeEnd] = useState(isoDate(now));
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [openId, setOpenId] = useState<number | null>(null);

  const [data, setData] = useState<EmployeeReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { start, end } = periodRange(mode, year, month, rangeStart, rangeEnd);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    if (!token || !start || !end) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetchEmployeeReport(token, start, end)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token, start, end]);

  const rows = useMemo(() => {
    const list = data?.employees || [];
    return employeeId === "all" ? list : list.filter((e) => String(e.user_id) === employeeId);
  }, [data, employeeId]);

  // เลือกพนักงานคนเดียว → เปิดรายละเอียดให้เลย
  useEffect(() => {
    if (employeeId !== "all") setOpenId(Number(employeeId));
  }, [employeeId]);

  const opened = rows.find((r) => r.user_id === openId) || null;
  const label = periodLabel(start, end);
  const printHref = `/reports/employees/print?start=${start}&end=${end}${employeeId !== "all" ? `&employee=${employeeId}` : ""}`;

  return (
    <div className="w-full p-6 space-y-6">
      {/* ตัวกรอง */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">รายงานพนักงาน</h2>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <select value={mode} onChange={(e) => setMode(e.target.value as PeriodMode)} className="px-3 py-2 border rounded-lg">
            <option value="month">รายเดือน</option>
            <option value="year">รายปี</option>
            <option value="range">เลือกช่วงวันที่</option>
          </select>

          {mode !== "range" && (
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 border rounded-lg">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>
          )}
          {mode === "month" && (
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 border rounded-lg">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}
          {mode === "range" && (
            <>
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="px-3 py-2 border rounded-lg" />
              <span>ถึง</span>
              <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="px-3 py-2 border rounded-lg" />
            </>
          )}

          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="all">พนักงานทั้งหมด</option>
            {(data?.employees || []).map((e) => (
              <option key={e.user_id} value={e.user_id}>
                {e.name}
              </option>
            ))}
          </select>

          <NextLink
            href={printHref}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Printer className="h-4 w-4" />
            พิมพ์รายงาน
          </NextLink>
        </div>
      </div>

      {data?.warnings?.length ? (
        <div className="flex gap-2 rounded-lg bg-amber-50 text-amber-800 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{data.warnings.map((w) => <div key={w}>{w}</div>)}</div>
        </div>
      ) : null}
      {error && <div className="rounded-lg bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
      {loading && <div className="text-sm text-gray-500">กำลังโหลด...</div>}

      {data && !loading && (
        <>
          {/* ผลงานขาย + บริการ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-3">ผลงานขายและบริการ · {label}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className={th}>พนักงาน</th>
                    <th className={thR}>ขาย (ใบ)</th>
                    <th className={thR}>ขาย (คัน)</th>
                    <th className={thR}>มูลค่าขาย</th>
                    <th className={thR}>รอจบรายการ</th>
                    <th className={thR}>เช็คลิสต์ขาย ไม่ครบ</th>
                    <th className={thR}>งานบริการ</th>
                    <th className={thR}>ยอดบริการ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.user_id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className={td}>
                        <NameButton r={r} onClick={() => setOpenId(r.user_id)} />
                      </td>
                      <td className={tdR}>{r.sales.orders}</td>
                      <td className={tdR}>{r.sales.bikes}</td>
                      <td className={tdR}>{money(r.sales.amount)}</td>
                      <td className={tdR}>{r.sales.pending || "-"}</td>
                      <td className={tdR}>{r.sales.checklist_incomplete ? <Badge tone="amber">{r.sales.checklist_incomplete}</Badge> : "-"}</td>
                      <td className={tdR}>{r.services.count}</td>
                      <td className={tdR}>{money(r.services.amount)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-gray-400 py-6">
                        ไม่มีข้อมูลในช่วงนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* การทำงาน */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-3">การทำงาน · {label}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className={th}>พนักงาน</th>
                    <th className={thR}>งานเสร็จ</th>
                    <th className={thR}>ตรงเวลา</th>
                    <th className={thR}>เกินกำหนด</th>
                    <th className={thR}>เช็คอิน</th>
                    <th className={thR}>Note ปิดร้าน</th>
                    <th className={thR}>เข้าระบบ</th>
                    <th className={thR}>เงินสดค้างส่ง</th>
                    <th className={thR}>ส่งเงินไม่ตรง</th>
                    <th className={thR}>ปัญหา แจ้ง/รับ/แก้</th>
                    <th className={thR}>เบิก (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const pct = onTimePct(r);
                    return (
                      <tr key={r.user_id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className={td}>
                          <NameButton r={r} onClick={() => setOpenId(r.user_id)} />
                        </td>
                        <td className={tdR}>
                          {r.tasks.total ? `${r.tasks.done}/${r.tasks.total}` : "-"}
                        </td>
                        <td className={tdR}>{pct === null ? "-" : `${pct}%`}</td>
                        <td className={tdR}>{r.tasks.overdue_open ? <Badge tone="red">{r.tasks.overdue_open}</Badge> : "-"}</td>
                        <td className={tdR}>{r.checkin_days} วัน</td>
                        <td className={tdR}>
                          {r.note_days} วัน
                          {r.note_days > r.note_complete_days && (
                            <span className="text-amber-700"> ({r.note_days - r.note_complete_days} ไม่ครบ)</span>
                          )}
                        </td>
                        <td className={tdR}>
                          {r.login.days} วัน
                          {r.login.no_logout > 0 && <span className="text-gray-400"> ({r.login.no_logout} ไม่กดออก)</span>}
                        </td>
                        <td className={tdR}>
                          {r.cash.unsent_amount > 0 ? <Badge tone="amber">{money(r.cash.unsent_amount)}</Badge> : "-"}
                        </td>
                        <td className={tdR}>{r.cash.mismatch ? <Badge tone="red">{r.cash.mismatch} ครั้ง</Badge> : "-"}</td>
                        <td className={tdR}>
                          {r.issues.reported}/{r.issues.assigned}/{r.issues.resolved}
                        </td>
                        <td className={tdR}>{r.expenses.approved_amount ? money(r.expenses.approved_amount) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              งานเสร็จนับงานที่อยู่ในมือช่วงนี้ · เงินสดค้างส่งเป็นยอด ณ ตอนนี้ · เข้าระบบเริ่มเก็บตั้งแต่วันที่เปิดใช้ฟีเจอร์ · คลิกชื่อเพื่อดูรายละเอียด
            </p>
          </div>

          {opened && <EmployeeDetail r={opened} label={label} onClose={() => setOpenId(null)} />}
        </>
      )}
    </div>
  );
};

const NameButton = ({ r, onClick }: { r: EmployeeRow; onClick: () => void }) => (
  <button onClick={onClick} className="font-medium text-left hover:underline">
    {r.name}
    {r.role !== "emp" && <span className="ml-1 text-xs text-gray-400">({r.role})</span>}
    {!r.is_active && <span className="ml-1 text-xs text-gray-400">(ปิดบัญชี)</span>}
  </button>
);

const EmployeeDetail = ({ r, label, onClose }: { r: EmployeeRow; label: string; onClose: () => void }) => {
  const pct = onTimePct(r);
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">{r.name}</h3>
          <div className="text-sm text-gray-500">รายละเอียดการทำงาน · {label}</div>
        </div>
        <button onClick={onClose} aria-label="ปิด" className="p-1 rounded hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="ขาย" value={`${r.sales.bikes} คัน`} sub={`${money(r.sales.amount)} บาท · ${r.sales.orders} ใบ`} />
        <Metric
          label="งานบริการ"
          value={`${r.services.count} งาน`}
          sub={Object.entries(r.services.by_type).map(([k, v]) => `${k} ${v}`).join(" · ") || `${money(r.services.amount)} บาท`}
        />
        <Metric
          label="งานที่มอบหมาย"
          value={r.tasks.total ? `${r.tasks.done}/${r.tasks.total}` : "-"}
          sub={[
            pct !== null && `ตรงเวลา ${pct}%`,
            r.tasks.late_done && `เสร็จช้า ${r.tasks.late_done}`,
            r.tasks.progress_avg_pct !== null && `ความคืบหน้าเฉลี่ย ${r.tasks.progress_avg_pct}%`,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Metric label="เช็คอิน" value={`${r.checkin_days} วัน`} sub={`Note ปิดร้าน ${r.note_days} วัน (ครบ ${r.note_complete_days})`} />
        <Metric
          label="เข้าระบบ"
          value={`${r.login.days} วัน`}
          sub={r.login.avg_first_login ? `เข้าเฉลี่ย ${r.login.avg_first_login} · ไม่กดออก ${r.login.no_logout}` : "ยังไม่มีข้อมูล"}
        />
        <Metric
          label="ส่งเงินสด"
          value={`${r.cash.handovers} ครั้ง`}
          sub={`${money(r.cash.sent_total)} บาท${r.cash.mismatch ? ` · ไม่ตรง ${r.cash.mismatch} (${money(r.cash.diff_total)})` : ""}`}
        />
        <Metric
          label="เงินสดค้างส่ง (ตอนนี้)"
          value={r.cash.unsent_amount ? money(r.cash.unsent_amount) : "0"}
          sub={r.cash.unsent_count ? `${r.cash.unsent_count} รายการ` : undefined}
        />
        <Metric
          label="ปัญหา"
          value={`แก้ ${r.issues.resolved}`}
          sub={[
            `แจ้ง ${r.issues.reported} · รับ ${r.issues.assigned}`,
            r.issues.open_assigned ? `ค้าง ${r.issues.open_assigned}` : "",
            r.issues.avg_resolve_hours !== null ? `แก้เฉลี่ย ${r.issues.avg_resolve_hours} ชม.` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Metric
          label="เบิกค่าใช้จ่าย"
          value={`${money(r.expenses.approved_amount)} บาท`}
          sub={`${r.expenses.count} ครั้ง · อนุมัติ ${r.expenses.approved} · ไม่อนุมัติ ${r.expenses.rejected} · รอ ${r.expenses.pending}`}
        />
      </div>

      {/* งานค้าง */}
      <section>
        <h4 className="font-semibold mb-2">งานที่ยังไม่เสร็จ ({r.open_tasks.length})</h4>
        {r.open_tasks.length === 0 ? (
          <p className="text-sm text-gray-400">ไม่มีงานค้าง</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {r.open_tasks.map((t, i) => (
                <tr key={i} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-3">
                    <div className="line-clamp-2">{t.content}</div>
                    {t.note && <div className="text-xs text-gray-500">หมายเหตุ: {t.note}</div>}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-gray-600">
                    {t.target_quantity ? `${t.current_progress}/${t.target_quantity} ${t.target_unit}` : ""}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-gray-600">{t.due_date ? `กำหนด ${thDate(t.due_date)}` : "ไม่มีกำหนด"}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {t.overdue ? (
                      <Badge tone="red">เกินกำหนด</Badge>
                    ) : (
                      <Badge tone={t.status === "issue" ? "amber" : t.status === "in_progress" ? "blue" : "gray"}>
                        {TASK_STATUS_LABEL[t.status] || t.status}
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Note ปิดร้าน + เข้า-ออกระบบ รวมตามวัน */}
      <section>
        <h4 className="font-semibold mb-2">บันทึกรายวัน</h4>
        <DailyTable r={r} />
      </section>
    </div>
  );
};

const DailyTable = ({ r }: { r: EmployeeRow }) => {
  const days = useMemo(() => {
    const map = new Map<string, { note?: EmployeeRow["notes"][number]; login?: EmployeeRow["login_days"][number] }>();
    r.notes.forEach((n) => map.set(n.date, { ...map.get(n.date), note: n }));
    r.login_days.forEach((l) => map.set(l.date, { ...map.get(l.date), login: l }));
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [r]);

  if (days.length === 0) return <p className="text-sm text-gray-400">ยังไม่มีบันทึกในช่วงนี้</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className={th}>วันที่</th>
            <th className={th}>เข้า-ออกระบบ</th>
            <th className={th}>วันนี้ทำอะไร</th>
            <th className={th}>ปัญหา</th>
            <th className={th}>ฝากงานพรุ่งนี้</th>
          </tr>
        </thead>
        <tbody>
          {days.map(([date, d]) => (
            <tr key={date} className="border-b last:border-0 align-top">
              <td className={td}>{thDate(date)}</td>
              <td className={td}>
                {d.login ? (
                  <>
                    {d.login.first_in} - {d.login.last_out || <span className="text-amber-700">ไม่กดออก</span>}
                    {d.login.sessions > 1 && <span className="text-gray-400"> ({d.login.sessions} ครั้ง)</span>}
                  </>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="px-3 py-2">
                {d.note ? (
                  <>
                    {!d.note.checklist_ok && <Badge tone="amber">เช็คลิสต์ไม่ครบ</Badge>} {d.note.today || "-"}
                  </>
                ) : (
                  <span className="text-gray-400">ไม่ได้เขียน note</span>
                )}
              </td>
              <td className="px-3 py-2">{d.note?.issue || "-"}</td>
              <td className="px-3 py-2">{d.note?.tomorrow || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeReports;