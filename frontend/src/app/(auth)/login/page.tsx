import React from "react";
import LoginForm from "./components/LoginForm";

interface LoginPageProps {
	searchParams?: { expired?: string; callbackUrl?: string };
}

/**
 * หน้าเข้าสู่ระบบ
 * - จอใหญ่: ซ้ายแบรนด์ (พื้นกรม แถบส้มเฉียง) / ขวาฟอร์ม
 * - มือถือ: การ์ดฟอร์มอย่างเดียว
 * - ?expired=1  → แจ้ง "หมดเวลาการใช้งาน" (ถูกพาออกเพราะ token หมดอายุ/ต่ออายุไม่ได้)
 * - ?callbackUrl → ล็อกอินเสร็จกลับไปหน้าเดิม
 */
const LoginPage = ({ searchParams }: LoginPageProps) => {
	const expired = searchParams?.expired === "1";
	const callbackUrl = searchParams?.callbackUrl;

	return (
		<div className="min-h-screen w-full grid lg:grid-cols-[1.1fr_1fr] bg-[#151a25] text-slate-900">
			{/* ---------- ฝั่งแบรนด์ (จอใหญ่) ---------- */}
			<section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#1e2432] text-white px-16 py-12">
				<div className="absolute top-0 bottom-0 -right-28 w-[300px] bg-[#F26B1D] -skew-x-[16deg]" />
				<div className="absolute top-0 bottom-0 right-[170px] w-[22px] bg-[#FF8A3D]/60 -skew-x-[16deg]" />

				{/* เว้นบนให้สมดุลกับ © ด้านล่าง */}
				<span />

				{/* โลโก้ + ชื่อระบบ จัดเป็นกลุ่มเดียวกลางแนวตั้ง */}
				<div className="relative z-10 max-w-[420px]">
					<img src="/logo.png" alt="นพดลมอเตอร์กรุ้ป" className="h-24 w-auto" />

					<div className="mt-8 mb-6 flex items-center gap-2">
						<span className="h-1 w-12 rounded-full bg-[#F26B1D]" />
						<span className="h-1 w-3 rounded-full bg-[#F26B1D]/50" />
					</div>

					<h1 className="flex items-baseline gap-3 text-4xl font-semibold leading-tight">
						คาราเมโล
						<span className="rounded-md border-2 border-[#FF8A3D] px-2 text-xl font-bold tracking-wider text-[#FF8A3D]">
							POS
						</span>
					</h1>
					<p className="mt-3 text-base text-slate-300">ระบบจัดการร้านรถจักรยานยนต์ ขาย · ซ่อม · ทะเบียน</p>
				</div>

				<p className="relative z-10 text-sm text-slate-400">© นพดลมอเตอร์กรุ้ป</p>
			</section>

			{/* ---------- ฝั่งฟอร์ม ---------- */}
			<section className="relative overflow-hidden flex items-center justify-center px-5 py-10 bg-[#1e2432] lg:bg-[#f4f5f8]">
				{/* แถบส้มมุมขวาบน (มือถือ) */}
				<div className="lg:hidden absolute -right-28 top-0 h-56 w-64 bg-[#F26B1D] -skew-x-[16deg]" />

				<div className="relative w-full max-w-[380px] rounded-3xl bg-white p-6 shadow-2xl lg:bg-transparent lg:p-0 lg:shadow-none">
					{/* โลโก้ (มือถือ) */}
					<img src="/logo.png" alt="นพดลมอเตอร์กรุ้ป" className="lg:hidden mb-5 h-11 w-auto" />

					<h2 className="text-[26px] font-semibold text-[#1e2432]">เข้าสู่ระบบ</h2>
					<p className="mt-1 mb-6 text-sm text-slate-600">กรอกชื่อผู้ใช้และรหัสผ่านของคุณ</p>

					<LoginForm expired={expired} callbackUrl={callbackUrl} />

					<p className="mt-6 text-center text-xs text-slate-500">ติดปัญหาการเข้าระบบ ติดต่อผู้ดูแลระบบ</p>
				</div>
			</section>
		</div>
	);
};

export default LoginPage;