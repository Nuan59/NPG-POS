"use client";

// EmployeeReportPDF.tsx
// วางไฟล์นี้ใน: src/components/pdf/EmployeeReportPDF.tsx
// ✅ รายงานพนักงาน: หน้าแรก (แนวนอน) = ตารางสรุปทุกคน / ถัดไปคนละหน้า (แนวตั้ง) = รายละเอียดการทำงานรายคน
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { registerFonts, ZWJ, sanitizeText } from "@/components/pdf/Salereceiptutils";
import {
  EmployeeRow,
  TASK_STATUS_LABEL,
  money,
  onTimePct,
  thDate,
} from "@/app/(private)/reports/util/employeeTypes";

registerFonts();

const COMPANY_NAME = "ห้างหุ้นส่วนจำกัด นพดลมอเตอร์กรุ้ป";
const COMPANY_ADDRESS = "359/2 หมู่ 6 ตำบลร้องเข็ม อำเภอร้องกวาง จังหวัดแพร่ 54140";

const s = StyleSheet.create({
  page: { padding: 32, fontFamily: "Sarabun", fontSize: 9, color: "#1a1a1a" },
  header: { flexDirection: "row", alignItems: "center", borderBottom: "2pt solid #1a1a1a", paddingBottom: 8, marginBottom: 10 },
  logo: { width: 40, height: 40, marginRight: 8, objectFit: "contain" },
  companyName: { fontSize: 12, fontWeight: "bold" },
  companyDetail: { fontSize: 8, color: "#444" },
  title: { fontSize: 13, fontWeight: "bold", textAlign: "center" },
  period: { fontSize: 10, textAlign: "center", color: "#333", marginTop: 2 },
  printed: { fontSize: 7.5, color: "#888", textAlign: "right", marginBottom: 6 },
  section: { fontSize: 10.5, fontWeight: "bold", marginTop: 12, marginBottom: 5, borderLeft: "3pt solid #1a1a1a", paddingLeft: 6 },
  table: { border: "1pt solid #999" },
  headRow: { flexDirection: "row", backgroundColor: "#e5e5e5", borderBottom: "1pt solid #999" },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #ddd" },
  th: { padding: 4, fontSize: 8, fontWeight: "bold" },
  td: { padding: 4, fontSize: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", border: "1pt solid #ccc" },
  cell: { width: "33.33%", padding: 6, borderRight: "1pt solid #ccc", borderBottom: "1pt solid #ccc" },
  cellLabel: { fontSize: 7.5, color: "#666" },
  cellValue: { fontSize: 11, fontWeight: "bold" },
  cellSub: { fontSize: 7.5, color: "#444", marginTop: 1 },
  empty: { fontSize: 8, color: "#888" },
  note: { fontSize: 7, color: "#888", marginTop: 4 },
  footer: { position: "absolute", bottom: 16, left: 32, right: 32, fontSize: 7, color: "#999", textAlign: "right" },
});

const T = ({ children, style }: { children: any; style?: any }) => (
  <Text style={style}>
    {sanitizeText(String(children ?? ""))}
    {ZWJ}
  </Text>
);

type Col = { label: string; w: string; right?: boolean; get: (r: EmployeeRow) => string };

const SALES_COLS: Col[] = [
  { label: "พนักงาน", w: "22%", get: (r) => r.name },
  { label: "ขาย (ใบ)", w: "10%", right: true, get: (r) => String(r.sales.orders) },
  { label: "ขาย (คัน)", w: "10%", right: true, get: (r) => String(r.sales.bikes) },
  { label: "มูลค่าขาย", w: "14%", right: true, get: (r) => money(r.sales.amount) },
  { label: "รอจบรายการ", w: "10%", right: true, get: (r) => String(r.sales.pending) },
  { label: "เช็คลิสต์ไม่ครบ", w: "12%", right: true, get: (r) => String(r.sales.checklist_incomplete) },
  { label: "งานบริการ", w: "10%", right: true, get: (r) => String(r.services.count) },
  { label: "ยอดบริการ", w: "12%", right: true, get: (r) => money(r.services.amount) },
];

const WORK_COLS: Col[] = [
  { label: "พนักงาน", w: "14%", get: (r) => r.name },
  { label: "งานเสร็จ", w: "8%", right: true, get: (r) => (r.tasks.total ? `${r.tasks.done}/${r.tasks.total}` : "-") },
  { label: "ตรงเวลา", w: "7%", right: true, get: (r) => { const p = onTimePct(r); return p === null ? "-" : `${p}%`; } },
  { label: "เกินกำหนด", w: "8%", right: true, get: (r) => String(r.tasks.overdue_open) },
  { label: "เช็คอิน (วัน)", w: "8%", right: true, get: (r) => String(r.checkin_days) },
  { label: "Note ครบ/ส่ง", w: "9%", right: true, get: (r) => `${r.note_complete_days}/${r.note_days}` },
  { label: "เข้าระบบ (วัน)", w: "9%", right: true, get: (r) => String(r.login.days) },
  { label: "ค้างส่งเงิน", w: "9%", right: true, get: (r) => money(r.cash.unsent_amount) },
  { label: "ส่งเงินไม่ตรง", w: "8%", right: true, get: (r) => String(r.cash.mismatch) },
  { label: "ปัญหา แจ้ง/รับ/แก้", w: "11%", right: true, get: (r) => `${r.issues.reported}/${r.issues.assigned}/${r.issues.resolved}` },
  { label: "เบิก (บาท)", w: "9%", right: true, get: (r) => money(r.expenses.approved_amount) },
];

const Table = ({ cols, rows }: { cols: Col[]; rows: EmployeeRow[] }) => (
  <View style={s.table}>
    <View style={s.headRow} fixed>
      {cols.map((c) => (
        <T key={c.label} style={[s.th, { width: c.w, textAlign: c.right ? "right" : "left" }]}>{c.label}</T>
      ))}
    </View>
    {rows.map((r) => (
      <View key={r.user_id} style={s.row} wrap={false}>
        {cols.map((c) => (
          <T key={c.label} style={[s.td, { width: c.w, textAlign: c.right ? "right" : "left" }]}>{c.get(r)}</T>
        ))}
      </View>
    ))}
  </View>
);

const Header = ({ title, label, printedAt }: { title: string; label: string; printedAt: string }) => (
  <>
    <View style={s.header}>
      <Image src="/logo.png" style={s.logo} />
      <View>
        <T style={s.companyName}>{COMPANY_NAME}</T>
        <T style={s.companyDetail}>{COMPANY_ADDRESS}</T>
      </View>
    </View>
    <T style={s.title}>{title}</T>
    <T style={s.period}>{`ประจำ${label}`}</T>
    <T style={s.printed}>{`จัดทำรายงานวันที่ ${printedAt}`}</T>
  </>
);

const Cell = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View style={s.cell}>
    <T style={s.cellLabel}>{label}</T>
    <T style={s.cellValue}>{value}</T>
    {sub ? <T style={s.cellSub}>{sub}</T> : null}
  </View>
);

const Detail = ({ r }: { r: EmployeeRow }) => {
  const pct = onTimePct(r);
  const days = new Map<string, { note?: EmployeeRow["notes"][number]; login?: EmployeeRow["login_days"][number] }>();
  r.notes.forEach((n) => days.set(n.date, { ...days.get(n.date), note: n }));
  r.login_days.forEach((l) => days.set(l.date, { ...days.get(l.date), login: l }));
  const dayRows = Array.from(days.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <>
      <T style={s.section}>{`${r.name} - สรุปการทำงาน`}</T>
      <View style={s.grid} wrap={false}>
        <Cell label="ขาย" value={`${r.sales.bikes} คัน`} sub={`${money(r.sales.amount)} บาท · ${r.sales.orders} ใบ · รอจบ ${r.sales.pending}`} />
        <Cell
          label="งานบริการ"
          value={`${r.services.count} งาน`}
          sub={`${money(r.services.amount)} บาท · ${Object.entries(r.services.by_type).map(([k, v]) => `${k} ${v}`).join(" · ")}`}
        />
        <Cell
          label="งานที่มอบหมาย"
          value={r.tasks.total ? `${r.tasks.done}/${r.tasks.total}` : "-"}
          sub={`ตรงเวลา ${pct === null ? "-" : pct + "%"} · เสร็จช้า ${r.tasks.late_done} · เกินกำหนด ${r.tasks.overdue_open}`}
        />
        <Cell label="เช็คอิน" value={`${r.checkin_days} วัน`} sub={`Note ปิดร้าน ${r.note_days} วัน · ครบ ${r.note_complete_days}`} />
        <Cell
          label="เข้าระบบ"
          value={`${r.login.days} วัน`}
          sub={r.login.avg_first_login ? `เข้าเฉลี่ย ${r.login.avg_first_login} · ไม่กดออก ${r.login.no_logout}` : "ยังไม่มีข้อมูล"}
        />
        <Cell
          label="ส่งเงินสด"
          value={`${r.cash.handovers} ครั้ง`}
          sub={`${money(r.cash.sent_total)} บาท · ไม่ตรง ${r.cash.mismatch} (${money(r.cash.diff_total)}) · ค้างส่ง ${money(r.cash.unsent_amount)}`}
        />
        <Cell
          label="ปัญหา"
          value={`แก้ ${r.issues.resolved}`}
          sub={`แจ้ง ${r.issues.reported} · รับ ${r.issues.assigned} · ค้าง ${r.issues.open_assigned}${r.issues.avg_resolve_hours !== null ? ` · แก้เฉลี่ย ${r.issues.avg_resolve_hours} ชม.` : ""}`}
        />
        <Cell
          label="เบิกค่าใช้จ่าย"
          value={`${money(r.expenses.approved_amount)} บาท`}
          sub={`${r.expenses.count} ครั้ง · อนุมัติ ${r.expenses.approved} · ไม่อนุมัติ ${r.expenses.rejected} · รอ ${r.expenses.pending}`}
        />
        <Cell label="ความคืบหน้างานเป้าหมาย" value={r.tasks.progress_avg_pct === null ? "-" : `${r.tasks.progress_avg_pct}%`} />
      </View>

      <T style={s.section}>{`งานที่ยังไม่เสร็จ (${r.open_tasks.length})`}</T>
      {r.open_tasks.length === 0 ? (
        <T style={s.empty}>ไม่มีงานค้าง</T>
      ) : (
        <View style={s.table}>
          <View style={s.headRow} fixed>
            <T style={[s.th, { width: "52%" }]}>งาน</T>
            <T style={[s.th, { width: "16%" }]}>ความคืบหน้า</T>
            <T style={[s.th, { width: "16%" }]}>กำหนด</T>
            <T style={[s.th, { width: "16%" }]}>สถานะ</T>
          </View>
          {r.open_tasks.map((t, i) => (
            <View key={i} style={s.row} wrap={false}>
              <T style={[s.td, { width: "52%" }]}>{t.content}</T>
              <T style={[s.td, { width: "16%" }]}>{t.target_quantity ? `${t.current_progress}/${t.target_quantity} ${t.target_unit}` : "-"}</T>
              <T style={[s.td, { width: "16%" }]}>{t.due_date ? thDate(t.due_date) : "-"}</T>
              <T style={[s.td, { width: "16%" }]}>{t.overdue ? "เกินกำหนด" : TASK_STATUS_LABEL[t.status] || t.status}</T>
            </View>
          ))}
        </View>
      )}

      <T style={s.section}>บันทึกรายวัน</T>
      {dayRows.length === 0 ? (
        <T style={s.empty}>ยังไม่มีบันทึกในช่วงนี้</T>
      ) : (
        <View style={s.table}>
          <View style={s.headRow} fixed>
            <T style={[s.th, { width: "12%" }]}>วันที่</T>
            <T style={[s.th, { width: "15%" }]}>เข้า-ออก</T>
            <T style={[s.th, { width: "33%" }]}>วันนี้ทำอะไร</T>
            <T style={[s.th, { width: "20%" }]}>ปัญหา</T>
            <T style={[s.th, { width: "20%" }]}>ฝากงานพรุ่งนี้</T>
          </View>
          {dayRows.map(([date, d]) => (
            <View key={date} style={s.row} wrap={false}>
              <T style={[s.td, { width: "12%" }]}>{thDate(date)}</T>
              <T style={[s.td, { width: "15%" }]}>
                {d.login ? `${d.login.first_in} - ${d.login.last_out || "ไม่กดออก"}` : "-"}
              </T>
              <T style={[s.td, { width: "33%" }]}>
                {d.note ? `${d.note.checklist_ok ? "" : "[เช็คลิสต์ไม่ครบ] "}${d.note.today || "-"}` : "ไม่ได้เขียน note"}
              </T>
              <T style={[s.td, { width: "20%" }]}>{d.note?.issue || "-"}</T>
              <T style={[s.td, { width: "20%" }]}>{d.note?.tomorrow || "-"}</T>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

interface Props {
  employees: EmployeeRow[];
  label: string;
}

export default function EmployeeReportPDF({ employees, label }: Props) {
  const printedAt = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Header title="รายงานพนักงาน" label={label} printedAt={printedAt} />
        <T style={s.section}>ผลงานขายและบริการ</T>
        <Table cols={SALES_COLS} rows={employees} />
        <T style={s.section}>การทำงาน</T>
        <Table cols={WORK_COLS} rows={employees} />
        <T style={s.note}>
          งานเสร็จนับงานที่อยู่ในมือช่วงนี้ · ค้างส่งเงินเป็นยอด ณ วันที่พิมพ์ · เข้าระบบนับตั้งแต่เริ่มเก็บข้อมูล
        </T>
        <Text style={s.footer} render={({ pageNumber, totalPages }) => `หน้า ${pageNumber}/${totalPages}`} fixed />
      </Page>

      {employees.map((r) => (
        <Page key={r.user_id} size="A4" style={s.page}>
          <Header title="รายละเอียดการทำงานรายบุคคล" label={label} printedAt={printedAt} />
          <Detail r={r} />
          <Text style={s.footer} render={({ pageNumber, totalPages }) => `หน้า ${pageNumber}/${totalPages}`} fixed />
        </Page>
      ))}
    </Document>
  );
}