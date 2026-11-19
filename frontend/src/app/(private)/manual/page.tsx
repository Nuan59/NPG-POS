"use client";

import { Fragment, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Prompt } from "next/font/google";
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, ClipboardList, Eye,
  Landmark, Lightbulb, LifeBuoy, Moon, Printer, Receipt, Rocket, Search, Send, ShieldCheck, ShoppingCart,
  Sparkles, Users, Wallet, Wrench, X,
} from "lucide-react";
import { useEmployeePermissions } from "@/app/hooks/useEmployeePermissions";
import {
  GLOSSARY, MANUAL_UPDATED_AT, ManualBlock, ManualIcon, ManualSection, QUICK_GUIDES, QuickGuide, SECTIONS, UPDATES,
} from "./manualContent";
import { CashflowDiagram, SaleDiagram } from "./ManualDiagrams";

// ✅ คู่มือใช้ตัวหนังสือหนาปกติ (ทั้งแอปใช้ weight 100 บางมาก อ่านยากสำหรับบางคน)
const readable = Prompt({ weight: ["400", "500", "600", "700"], subsets: ["latin", "thai"], display: "swap" });

const ICONS: Record<ManualIcon, typeof BookOpen> = {
  start: Rocket, sale: ShoppingCart, customer: Users, npg: Landmark, cash: Wallet,
  service: Wrench, task: ClipboardList, admin: ShieldCheck, help: LifeBuoy,
  finish: CheckCircle2, send: Send, expense: Receipt, close: Moon,
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
    out.push(<mark key={at} className="bg-orange-200 text-inherit rounded px-0.5">{text.slice(at, at + q.length)}</mark>);
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
        <strong key={i} className="mx-0.5 inline-block whitespace-nowrap rounded-md border border-orange-200 bg-orange-50 px-1.5 leading-7 font-semibold text-[#c2410c]">
          {highlight(part.slice(2, -2), q)}
        </strong>
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
    case "admin": return b.blocks.map(blockText).join(" ");
    case "diagram": return "";
  }
};
const guideText = (g: QuickGuide) =>
  [g.title, g.when, g.done, g.warn ?? "", ...g.steps.flatMap((s) => [s.text, s.look ?? ""])].join(" ").toLowerCase();

// ---------------------------------------------------------------- บล็อกเนื้อหา

const BODY = "text-base leading-8 text-slate-700";

const Block = ({ b, q, showAdmin }: { b: ManualBlock; q: string; showAdmin: boolean }) => {
  switch (b.kind) {
    case "p":
      return <p className={BODY}><Rich text={b.text} q={q} /></p>;
    case "sub":
      return (
        <h3 className="flex items-center gap-2 pt-3 text-lg font-bold text-[#1e2432]">
          <span className="h-5 w-1.5 rounded-full bg-[#F26B1D]" />
          <Rich text={b.title} q={q} />
        </h3>
      );
    case "steps":
      return (
        <ol className="space-y-3">
          {b.items.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-1 h-7 w-7 shrink-0 rounded-full bg-[#1e2432] text-white text-sm font-bold grid place-items-center tabular-nums">
                {i + 1}
              </span>
              <span className={BODY}><Rich text={t} q={q} /></span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="space-y-2">
          {b.items.map((t, i) => (
            <li key={i} className={`flex gap-3 ${BODY}`}>
              <span className="mt-[13px] h-2 w-2 shrink-0 rounded-full bg-[#F26B1D]" />
              <span><Rich text={t} q={q} /></span>
            </li>
          ))}
        </ul>
      );
    case "checklist":
      return (
        <ul className="grid gap-2 sm:grid-cols-2">
          {b.items.map((t, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-700">
              <span className="h-6 w-6 shrink-0 rounded-md bg-emerald-500 text-white grid place-items-center"><Check size={15} strokeWidth={3} /></span>
              <Rich text={t} q={q} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="bg-[#1e2432] text-white">
                {b.head.map((h) => <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {b.rows.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-slate-50/70" : "bg-white"}>
                  {r.map((c, j) => (
                    <td key={j} className={`px-4 py-3 align-top leading-7 ${j === 0 ? "font-semibold text-[#1e2432] min-w-[130px]" : "text-slate-700"}`}>
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
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base leading-8 text-emerald-900">
          <Lightbulb size={20} className="mt-1.5 shrink-0 text-emerald-600" />
          <span><Rich text={b.text} q={q} /></span>
        </div>
      );
    case "warn":
      return (
        <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base leading-8 text-amber-900">
          <AlertTriangle size={20} className="mt-1.5 shrink-0 text-amber-600" />
          <span><Rich text={b.text} q={q} /></span>
        </div>
      );
    case "diagram":
      return (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4">
          {b.name === "cashflow" ? <CashflowDiagram /> : <SaleDiagram />}
        </div>
      );
    case "admin":
      if (!showAdmin) return null;
      return (
        <details className="group rounded-xl border border-slate-300 bg-slate-50" open={!!q}>
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[15px] font-semibold text-[#1e2432]">
            <ShieldCheck size={18} className="text-[#F26B1D]" /> สำหรับ adm
            <ChevronDown size={16} className="ml-auto text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-slate-200 px-4 py-4">
            {b.blocks.map((x, i) => <Block key={i} b={x} q={q} showAdmin={showAdmin} />)}
          </div>
        </details>
      );
  }
};

// ---------------------------------------------------------------- วิธีทำทีละขั้น

const GuideView = ({ g, onBack }: { g: QuickGuide; onBack: () => void }) => {
  const Icon = ICONS[g.icon];
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-[#F26B1D]/40 bg-white">
      <header className="flex items-center gap-3 bg-[#1e2432] px-5 py-4 text-white">
        <button
          onClick={onBack}
          className="no-print flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-base font-semibold hover:bg-white/20"
        >
          <ArrowLeft size={18} /> กลับ
        </button>
        <span className="h-11 w-11 shrink-0 rounded-xl bg-[#F26B1D] grid place-items-center"><Icon size={24} /></span>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold">{g.title}</h2>
          <p className="text-sm text-white/70">ใช้ตอน: {g.when}</p>
        </div>
      </header>

      <ol className="divide-y divide-slate-100">
        {g.steps.map((s, i) => (
          <li key={i} className="flex gap-4 px-5 py-4 sm:px-6">
            <span className="h-10 w-10 shrink-0 rounded-full bg-[#F26B1D] text-white text-lg font-bold grid place-items-center tabular-nums shadow-sm">
              {i + 1}
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-lg leading-8 text-slate-800"><Rich text={s.text} q="" /></p>
              {s.look && (
                <p className="mt-1 flex items-start gap-1.5 text-[15px] leading-7 text-slate-500">
                  <Eye size={16} className="mt-1.5 shrink-0" /> {s.look}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-6">
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base leading-8 text-emerald-900">
          <CheckCircle2 size={22} className="mt-1 shrink-0 text-emerald-600" />
          <span><strong className="font-bold">เสร็จแล้ว:</strong> {g.done}</span>
        </div>
        {g.warn && (
          <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base leading-8 text-amber-900">
            <AlertTriangle size={22} className="mt-1 shrink-0 text-amber-600" />
            <span><strong className="font-bold">ระวัง:</strong> {g.warn}</span>
          </div>
        )}
        <div className="no-print flex flex-wrap gap-2 pt-1">
          {g.go && (
            <Link
              href={g.go.href}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F26B1D] px-5 py-3 text-base font-bold text-white shadow-sm hover:bg-[#d95c14]"
            >
              {g.go.label} <ArrowRight size={18} />
            </Link>
          )}
          <button onClick={onBack} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50">
            ดูเรื่องอื่น
          </button>
        </div>
      </div>
    </section>
  );
};

// ---------------------------------------------------------------- หน้า

export default function ManualPage() {
  const { isAdmin, isMonitor, loaded, canAccess } = useEmployeePermissions();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const showAdmin = isAdmin || isMonitor;

  // ✅ ลิงก์ #guide-xxx (เช่น จาก "มีอะไรใหม่") เปิดวิธีทำนั้นให้เลย
  useEffect(() => {
    const open = () => {
      const id = window.location.hash.slice(1);
      if (QUICK_GUIDES.some((g) => g.id === id)) {
        setOpenGuide(id);
        setQuery("");
        window.scrollTo({ top: 0 });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  const relevant = (s: { adminOnly?: boolean; permission?: string }) =>
    s.adminOnly ? isAdmin : canAccess(s.permission ?? null);
  const visible = <T extends { adminOnly?: boolean; permission?: string }>(x: T) => showAll || !loaded || relevant(x);

  const guides = useMemo(
    () => QUICK_GUIDES.filter(visible).filter((g) => !q || guideText(g).includes(q)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, showAll, loaded, isAdmin]
  );
  const glossary = GLOSSARY.filter((w) => !q || `${w.word} ${w.meaning}`.toLowerCase().includes(q));

  const sections = useMemo(() => {
    const base = SECTIONS.filter(visible);
    if (!q) return base.map((s) => ({ s, blocks: s.blocks }));
    return base
      .map((s: ManualSection) => {
        const hitTitle = `${s.title} ${s.summary}`.toLowerCase().includes(q);
        const blocks: ManualBlock[] = [];
        let lastSub: ManualBlock | null = null;
        for (const b of s.blocks) {
          if (b.kind === "sub") { lastSub = b; continue; }
          if (b.kind === "admin" && !showAdmin) continue;
          if (blockText(b).toLowerCase().includes(q)) {
            if (lastSub && !blocks.includes(lastSub)) blocks.push(lastSub);
            blocks.push(b);
          }
        }
        return { s, blocks: hitTitle && blocks.length === 0 ? s.blocks : blocks, hit: hitTitle || blocks.length > 0 };
      })
      .filter((x) => x.hit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, showAll, loaded, isAdmin, showAdmin]);

  const hidden = loaded ? SECTIONS.filter((s) => !relevant(s)).length + QUICK_GUIDES.filter((g) => !relevant(g)).length : 0;
  const guide = openGuide ? QUICK_GUIDES.find((g) => g.id === openGuide) : null;
  const nothing = q && guides.length === 0 && glossary.length === 0 && sections.length === 0;

  const pick = (id: string) => {
    setOpenGuide(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={`manual-page mx-auto max-w-5xl space-y-6 font-normal ${readable.className}`}>
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
          <p className="text-base text-white/80">กดปุ่มเรื่องที่อยากทำ แล้วทำตามทีละข้อ</p>
          <div className="no-print relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpenGuide(null); }}
              placeholder="หรือพิมพ์คำที่อยากรู้ เช่น ค่าปรับ"
              className="w-full rounded-xl bg-white pl-12 pr-12 py-3.5 text-lg text-slate-900 outline-none ring-2 ring-transparent focus:ring-[#F26B1D] placeholder:text-slate-400"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="ล้างคำค้น" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </section>

      {guide ? (
        <GuideView g={guide} onBack={() => { setOpenGuide(null); window.history.replaceState(null, "", "/manual"); }} />
      ) : (
        <>
          {/* ✅ อยากทำอะไร? */}
          {guides.length > 0 && (
            <section className="no-print space-y-3">
              <h2 className="text-xl font-bold text-[#1e2432]">{q ? "วิธีทำที่ตรงกับคำค้น" : "อยากทำอะไร?"}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {guides.map((g) => {
                  const Icon = ICONS[g.icon];
                  return (
                    <button
                      key={g.id}
                      onClick={() => pick(g.id)}
                      className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#F26B1D] hover:shadow-md"
                    >
                      <span className="h-12 w-12 rounded-xl bg-orange-50 text-[#F26B1D] grid place-items-center group-hover:bg-[#F26B1D] group-hover:text-white">
                        <Icon size={26} />
                      </span>
                      <span>
                        <span className="block text-lg font-bold leading-6 text-[#1e2432]">{g.title}</span>
                        <span className="mt-1 block text-sm leading-5 text-slate-500">{g.when}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ✅ คำที่ควรรู้ */}
          {glossary.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-[#1e2432]">
                <BookOpen size={20} className="text-[#F26B1D]" /> คำที่ควรรู้
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {glossary.map((w) => (
                  <div key={w.word} className="rounded-xl bg-slate-50 px-4 py-3">
                    <dt className="text-base font-bold text-[#1e2432]">{highlight(w.word, q)}</dt>
                    <dd className="text-[15px] leading-7 text-slate-600">{highlight(w.meaning, q)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* ✅ มีอะไรใหม่ */}
          {!q && (
            <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#1e2432]">
                <Sparkles size={20} className="text-[#F26B1D]" /> มีอะไรใหม่
              </h2>
              <ul className="space-y-3">
                {UPDATES.slice(0, 4).map((u) => (
                  <li key={u.date + u.title} className="flex flex-col gap-1 sm:flex-row sm:gap-3">
                    <span className="self-start shrink-0 whitespace-nowrap rounded-full border border-orange-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-[#F26B1D] tabular-nums">
                      {thaiDate(u.date)}
                    </span>
                    <span className="text-base leading-7 text-slate-700">
                      {u.section ? (
                        <a href={`#${u.section}`} className="font-bold text-[#1e2432] underline decoration-orange-300 underline-offset-4 hover:text-[#F26B1D]">{u.title}</a>
                      ) : (
                        <span className="font-bold text-[#1e2432]">{u.title}</span>
                      )}
                      {" — "}{u.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {nothing && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white py-14 text-center text-lg text-slate-500">
              ไม่เจอคำว่า &quot;{query}&quot; ลองพิมพ์คำอื่น หรือกดปุ่มเรื่องที่อยากทำด้านบน
            </div>
          )}

          {/* ✅ รายละเอียดทั้งหมด */}
          {sections.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
                <h2 className="text-xl font-bold text-[#1e2432]">{q ? "ในรายละเอียด" : "รายละเอียดแต่ละเรื่อง"}</h2>
                <div className="no-print flex gap-2">
                  {hidden > 0 && (
                    <button onClick={() => setShowAll(!showAll)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                      {showAll ? "แสดงเฉพาะเรื่องของฉัน" : "แสดงทุกเรื่อง"}
                    </button>
                  )}
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
                    <Printer size={15} /> พิมพ์
                  </button>
                </div>
              </div>

              {/* สารบัญ: ปุ่มเรื่อง */}
              {!q && (
                <nav className="no-print flex flex-wrap gap-2">
                  {sections.map(({ s }) => {
                    const Icon = ICONS[s.icon];
                    return (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[15px] font-medium text-slate-700 hover:border-[#F26B1D] hover:text-[#F26B1D]"
                      >
                        <Icon size={16} /> {s.title}
                      </a>
                    );
                  })}
                </nav>
              )}

              {sections.map(({ s, blocks }) => {
                const Icon = ICONS[s.icon];
                return (
                  <section key={s.id} id={s.id} className="manual-section scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span className="h-12 w-12 shrink-0 rounded-xl bg-orange-50 text-[#F26B1D] grid place-items-center">
                          <Icon size={24} />
                        </span>
                        <div>
                          <h2 className="text-xl font-bold text-[#1e2432]">{highlight(s.title, q)}</h2>
                          <p className="text-[15px] text-slate-500">{s.summary}</p>
                        </div>
                      </div>
                      {s.adminOnly && (
                        <span className="rounded-full bg-[#1e2432] px-3 py-1 text-xs font-semibold text-white">เฉพาะ adm</span>
                      )}
                    </header>
                    <div className="space-y-4 px-5 py-5 sm:px-6">
                      {blocks.map((b, i) => <Block key={i} b={b} q={q} showAdmin={showAdmin} />)}
                      {s.links && s.links.length > 0 && (
                        <div className="no-print flex flex-wrap gap-2 pt-2">
                          {s.links.map((l) => (
                            <Link
                              key={l.href}
                              href={l.href}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-[15px] font-semibold text-[#1e2432] hover:border-[#F26B1D] hover:bg-orange-50 hover:text-[#F26B1D]"
                            >
                              {l.label} <ArrowRight size={15} />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <p className="no-print pb-4 text-center text-[15px] text-slate-500">
            ยังไม่เข้าใจ หรือหน้าจอไม่เหมือนในคู่มือ ถาม adm ได้เลย
          </p>
        </>
      )}

      {/* ✅ พิมพ์: ซ่อนเมนู/แผงขาย/ปุ่ม ให้เหลือแต่เนื้อหา */}
      <style jsx global>{`
        @media print {
          nav, aside, .no-print { display: none !important; }
          body, main, section { background: #fff !important; }
          main > section { margin: 0 !important; padding: 0 !important; max-height: none !important; overflow: visible !important; }
          .manual-section { break-inside: avoid-page; border-color: #cbd5e1 !important; }
          .manual-page details { display: none; }
          .manual-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
