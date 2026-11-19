"use client";

import { Fragment, ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, BookOpen, Check, ClipboardList, Landmark, Lightbulb, LifeBuoy, Printer,
  Rocket, Search, ShieldCheck, ShoppingCart, Sparkles, Users, Wallet, Wrench, X,
} from "lucide-react";
import { useEmployeePermissions } from "@/app/hooks/useEmployeePermissions";
import { MANUAL_UPDATED_AT, ManualBlock, ManualIcon, ManualSection, SECTIONS, UPDATES } from "./manualContent";
import { CashflowDiagram, SaleDiagram } from "./ManualDiagrams";

const ICONS: Record<ManualIcon, typeof BookOpen> = {
  start: Rocket, sale: ShoppingCart, customer: Users, npg: Landmark, cash: Wallet,
  service: Wrench, task: ClipboardList, admin: ShieldCheck, help: LifeBuoy,
};

const thaiDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

// ---------------------------------------------------------------- ข้อความ: **ตัวหนา** + ไฮไลต์คำค้น

const highlight = (text: string, q: string): ReactNode => {
  if (!q) return text;
  const lower = text.toLowerCase();
  const out: ReactNode[] = [];
  let i = 0;
  let at = lower.indexOf(q);
  while (at !== -1) {
    if (at > i) out.push(text.slice(i, at));
    out.push(<mark key={at} className="bg-orange-200/80 text-inherit rounded px-0.5">{text.slice(at, at + q.length)}</mark>);
    i = at + q.length;
    at = lower.indexOf(q, i);
  }
  out.push(text.slice(i));
  return out;
};

const Rich = ({ text, q }: { text: string; q: string }) => (
  <>
    {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="font-semibold text-[#1e2432]">{highlight(part.slice(2, -2), q)}</strong>
      ) : (
        <Fragment key={i}>{highlight(part, q)}</Fragment>
      )
    )}
  </>
);

const blockText = (b: ManualBlock): string => {
  switch (b.kind) {
    case "p": case "tip": case "warn": return b.text;
    case "sub": return b.title;
    case "steps": case "list": case "checklist": return b.items.join(" ");
    case "table": return [...b.head, ...b.rows.flat()].join(" ");
    case "diagram": return "";
  }
};

// ---------------------------------------------------------------- บล็อกเนื้อหา

const Block = ({ b, q }: { b: ManualBlock; q: string }) => {
  switch (b.kind) {
    case "p":
      return <p className="text-[15px] leading-7 text-slate-700"><Rich text={b.text} q={q} /></p>;
    case "sub":
      return (
        <h3 className="flex items-center gap-2 pt-3 text-base font-bold text-[#1e2432]">
          <span className="h-4 w-1 rounded-full bg-[#F26B1D]" />
          <Rich text={b.title} q={q} />
        </h3>
      );
    case "steps":
      return (
        <ol className="space-y-2.5">
          {b.items.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-[#1e2432] text-white text-xs font-bold grid place-items-center tabular-nums">
                {i + 1}
              </span>
              <span className="text-[15px] leading-7 text-slate-700"><Rich text={t} q={q} /></span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="space-y-2">
          {b.items.map((t, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-7 text-slate-700">
              <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#F26B1D]" />
              <span><Rich text={t} q={q} /></span>
            </li>
          ))}
        </ul>
      );
    case "checklist":
      return (
        <ul className="grid gap-2 sm:grid-cols-2">
          {b.items.map((t, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="h-5 w-5 shrink-0 rounded-md bg-emerald-500 text-white grid place-items-center"><Check size={13} strokeWidth={3} /></span>
              <Rich text={t} q={q} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1e2432] text-white">
                {b.head.map((h) => <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {b.rows.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                  {r.map((c, j) => (
                    <td key={j} className={`px-3 py-2.5 align-top leading-6 ${j === 0 ? "font-semibold text-[#1e2432] min-w-[120px]" : "text-slate-700"}`}>
                      <Rich text={c} q={q} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "tip":
      return (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[15px] leading-7 text-emerald-900">
          <Lightbulb size={18} className="mt-1 shrink-0 text-emerald-600" />
          <span><Rich text={b.text} q={q} /></span>
        </div>
      );
    case "warn":
      return (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[15px] leading-7 text-amber-900">
          <AlertTriangle size={18} className="mt-1 shrink-0 text-amber-600" />
          <span><Rich text={b.text} q={q} /></span>
        </div>
      );
    case "diagram":
      return (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4">
          {b.name === "cashflow" ? <CashflowDiagram /> : <SaleDiagram />}
        </div>
      );
  }
};

// ---------------------------------------------------------------- หน้า

export default function ManualPage() {
  const { isAdmin, loaded, canAccess } = useEmployeePermissions();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const q = query.trim().toLowerCase();

  const relevant = (s: ManualSection) => (s.adminOnly ? isAdmin : canAccess(s.permission ?? null));

  const sections = useMemo(() => {
    const base = SECTIONS.filter((s) => showAll || !loaded || relevant(s));
    if (!q) return base.map((s) => ({ s, blocks: s.blocks }));
    return base
      .map((s) => {
        const hitTitle = `${s.title} ${s.summary}`.toLowerCase().includes(q);
        // ค้นเจอในบล็อกไหน → แสดงบล็อกนั้น + หัวข้อย่อยที่มันอยู่ใต้
        const blocks: ManualBlock[] = [];
        let lastSub: ManualBlock | null = null;
        for (const b of s.blocks) {
          if (b.kind === "sub") { lastSub = b; continue; }
          if (blockText(b).toLowerCase().includes(q)) {
            if (lastSub && !blocks.includes(lastSub)) blocks.push(lastSub);
            blocks.push(b);
          }
        }
        return { s, blocks: hitTitle && blocks.length === 0 ? s.blocks : blocks, hit: hitTitle || blocks.length > 0 };
      })
      .filter((x) => x.hit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, showAll, loaded, isAdmin]);

  const hidden = loaded ? SECTIONS.filter((s) => !relevant(s)).length : 0;

  return (
    <div className="manual-page space-y-6">
      {/* ✅ หัวคู่มือ */}
      <section className="relative overflow-hidden rounded-2xl bg-[#1e2432] text-white px-5 py-6 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#F26B1D]/25 blur-3xl" />
        <div className="pointer-events-none absolute right-6 top-0 bottom-0 hidden w-24 -skew-x-[18deg] bg-[#F26B1D] sm:block" />
        <div className="relative max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-xl bg-[#F26B1D] grid place-items-center shadow-lg shadow-orange-900/30">
              <BookOpen size={24} />
            </span>
            <div>
              <p className="text-xs text-white/60">อัปเดตล่าสุด {thaiDate(MANUAL_UPDATED_AT)}</p>
              <h1 className="text-2xl sm:text-3xl font-bold">คู่มือการใช้งาน</h1>
            </div>
          </div>
          <p className="text-sm sm:text-base text-white/75">ทุกขั้นตอนที่ใช้ในร้าน ตั้งแต่ขาย รับชำระ NPG จนถึงปิดร้าน ค้นหาคำที่ต้องการได้เลย</p>
          <div className="no-print relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาในคู่มือ เช่น ค่าปรับ ส่งเงิน ผ่อนดาวน์"
              className="w-full rounded-xl bg-white pl-10 pr-10 py-3 text-[15px] text-slate-900 outline-none ring-2 ring-transparent focus:ring-[#F26B1D] placeholder:text-slate-400"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="ล้างคำค้น" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* ✅ สารบัญ */}
        <aside className="no-print min-w-0 lg:sticky lg:top-4 lg:self-start">
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:p-2">
            <p className="hidden px-3 pt-2 pb-1 text-xs font-semibold text-slate-400 lg:block">สารบัญ</p>
            {sections.map(({ s }) => {
              const Icon = ICONS[s.icon];
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex shrink-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#F26B1D] hover:text-[#F26B1D] lg:border-transparent lg:bg-transparent lg:hover:bg-orange-50"
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="whitespace-nowrap">{s.title}</span>
                </a>
              );
            })}
            <div className="hidden lg:block border-t border-slate-100 mt-1 pt-2 space-y-1">
              {hidden > 0 && (
                <button onClick={() => setShowAll(!showAll)} className="w-full rounded-xl px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50">
                  {showAll ? "แสดงเฉพาะที่ฉันใช้ได้" : `แสดงทุกหมวด (+${hidden})`}
                </button>
              )}
              <button onClick={() => window.print()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                <Printer size={15} /> พิมพ์คู่มือ
              </button>
            </div>
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          {/* ✅ มีอะไรใหม่ */}
          {!q && (
            <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#1e2432]">
                <Sparkles size={18} className="text-[#F26B1D]" /> มีอะไรใหม่
              </h2>
              <ul className="space-y-2.5">
                {UPDATES.slice(0, 5).map((u) => (
                  <li key={u.date + u.title} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                    <span className="mt-0.5 self-start shrink-0 rounded-full bg-white border border-orange-200 px-2 py-0.5 text-[11px] font-semibold text-[#F26B1D] tabular-nums whitespace-nowrap">
                      {thaiDate(u.date)}
                    </span>
                    <span className="text-sm leading-6 text-slate-700">
                      {u.section ? (
                        <a href={`#${u.section}`} className="font-semibold text-[#1e2432] hover:text-[#F26B1D]">{u.title}</a>
                      ) : (
                        <span className="font-semibold text-[#1e2432]">{u.title}</span>
                      )}
                      {" — "}{u.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {q && sections.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center text-slate-500">
              ไม่พบ &quot;{query}&quot; ในคู่มือ ลองคำอื่น เช่น ขาย NPG เงินสด
            </div>
          )}

          {sections.map(({ s, blocks }) => {
            const Icon = ICONS[s.icon];
            return (
              <section key={s.id} id={s.id} className="manual-section scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <span className="h-11 w-11 shrink-0 rounded-xl bg-orange-50 text-[#F26B1D] grid place-items-center">
                      <Icon size={22} />
                    </span>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-[#1e2432]">{highlight(s.title, q)}</h2>
                      <p className="text-sm text-slate-500">{s.summary}</p>
                    </div>
                  </div>
                  {s.adminOnly && (
                    <span className="rounded-full bg-[#1e2432] px-2.5 py-1 text-[11px] font-semibold text-white">เฉพาะ adm</span>
                  )}
                </header>
                <div className="space-y-4 px-5 py-5 sm:px-6">
                  {blocks.map((b, i) => <Block key={i} b={b} q={q} />)}
                  {s.links && s.links.length > 0 && (
                    <div className="no-print flex flex-wrap gap-2 pt-2">
                      {s.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-[#1e2432] hover:border-[#F26B1D] hover:bg-orange-50 hover:text-[#F26B1D]"
                        >
                          {l.label} <ArrowRight size={14} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          <p className="no-print pb-4 text-center text-xs text-slate-400">
            ไม่เจอสิ่งที่หา หรือคู่มือไม่ตรงกับหน้าจอจริง แจ้ง adm หรือตั้งกระทู้ได้เลย
          </p>
        </div>
      </div>

      {/* ✅ พิมพ์: ซ่อนเมนู/แผงขาย/สารบัญ ให้เหลือแต่เนื้อหา */}
      <style jsx global>{`
        @media print {
          nav, aside, .no-print { display: none !important; }
          body, main, section { background: #fff !important; }
          main > section { margin: 0 !important; padding: 0 !important; max-height: none !important; overflow: visible !important; }
          .manual-section { break-inside: avoid-page; border-color: #cbd5e1 !important; }
          .manual-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
