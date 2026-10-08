"use client";
import { User, Lock, Loader2, Eye, EyeOff, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import React, { FormEvent, useEffect, useRef, useState } from "react";

const LAST_USERNAME_KEY = "npg_last_username";

type Alert = { kind: "error" | "warn" | "info"; text: string } | null;

interface LoginFormProps {
	/** ถูกพาออกจากระบบเพราะหมดเวลาใช้งาน */
	expired?: boolean;
	/** หน้าที่จะกลับไปหลังล็อกอิน (ปลอดภัยเฉพาะ path ภายในเว็บ) */
	callbackUrl?: string;
}

/** รับเฉพาะ path ภายในเว็บ กันถูกพาไปเว็บอื่น (open redirect) */
const safeCallback = (url?: string) => {
	if (!url) return "/dashboard";
	try {
		const u = new URL(url, window.location.origin);
		if (u.origin !== window.location.origin || u.pathname.startsWith("/login")) return "/dashboard";
		return u.pathname + u.search;
	} catch {
		return "/dashboard";
	}
};

/** แปลง error จาก next-auth เป็นข้อความไทย */
const toAlert = (error: string): Alert => {
	if (error === "CredentialsSignin") return { kind: "error", text: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
	if (error.includes("ไม่อยู่ในเวลางาน")) return { kind: "warn", text: error };
	if (/fetch|network|ECONN|timeout/i.test(error)) {
		return { kind: "error", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง" };
	}
	return { kind: "error", text: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
};

const ALERT_STYLE = {
	error: "bg-red-50 text-red-700 border-red-200",
	warn: "bg-orange-50 text-orange-700 border-orange-200",
	info: "bg-blue-50 text-blue-700 border-blue-200",
};

const LoginForm = ({ expired = false, callbackUrl }: LoginFormProps) => {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [rememberUsername, setRememberUsername] = useState(true);
	const [capsLock, setCapsLock] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [alert, setAlert] = useState<Alert>(
		expired ? { kind: "info", text: "หมดเวลาการใช้งานแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง" } : null
	);
	const [invalidField, setInvalidField] = useState<"username" | "password" | null>(null);
	const submittingRef = useRef(false);
	const passwordRef = useRef<HTMLInputElement>(null);
	const usernameRef = useRef<HTMLInputElement>(null);

	// จำชื่อผู้ใช้ล่าสุด (ไม่จำรหัสผ่าน) - localStorage อาจใช้ไม่ได้ในบางโหมด จึงครอบ try
	useEffect(() => {
		try {
			const saved = localStorage.getItem(LAST_USERNAME_KEY);
			if (saved) {
				setUsername(saved);
				passwordRef.current?.focus();
				return;
			}
		} catch {}
		usernameRef.current?.focus();
	}, []);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (submittingRef.current) return;

		const user = username.trim();
		if (!user) {
			setInvalidField("username");
			setAlert({ kind: "error", text: "กรุณากรอกชื่อผู้ใช้" });
			usernameRef.current?.focus();
			return;
		}
		if (!password) {
			setInvalidField("password");
			setAlert({ kind: "error", text: "กรุณากรอกรหัสผ่าน" });
			passwordRef.current?.focus();
			return;
		}

		submittingRef.current = true;
		setIsLoading(true);
		setAlert(null);
		setInvalidField(null);

		try {
			const res = await signIn("credentials", { username: user, password, redirect: false });

			if (!res || res.error) {
				const a = toAlert(res?.error ?? "");
				setAlert(a);
				if (res?.error === "CredentialsSignin") {
					setInvalidField("password");
					setPassword("");
					passwordRef.current?.focus();
				}
				return;
			}

			try {
				if (rememberUsername) localStorage.setItem(LAST_USERNAME_KEY, user);
				else localStorage.removeItem(LAST_USERNAME_KEY);
			} catch {}

			setSuccess(true);
			router.replace(safeCallback(callbackUrl));
			router.refresh();
		} catch (error) {
			console.error("❌ login error:", error);
			setAlert({ kind: "error", text: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง" });
		} finally {
			submittingRef.current = false;
			setIsLoading(false);
		}
	};

	const checkCaps = (e: React.KeyboardEvent<HTMLInputElement>) => {
		setCapsLock(!!e.getModifierState?.("CapsLock"));
	};

	if (success) {
		return (
			<div className="py-8 text-center">
				<CheckCircle2 className="mx-auto mb-2 text-green-600" size={52} />
				<p className="font-semibold text-slate-900">เข้าสู่ระบบสำเร็จ</p>
				<p className="mt-1 text-sm text-slate-600">กำลังไปหน้าหลัก...</p>
			</div>
		);
	}

	const inputCls = (field: "username" | "password") =>
		`w-full rounded-xl border-[1.5px] bg-white py-3 pl-11 pr-11 text-[15px] font-medium text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 focus:ring-orange-500/15 ${
			invalidField === field ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-[#F26B1D]"
		}`;

	return (
		<form onSubmit={handleSubmit} noValidate className="text-left">
			{alert && (
				<div className={`mb-4 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[13.5px] leading-relaxed ${ALERT_STYLE[alert.kind]}`}>
					{alert.kind === "info" ? <Clock size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
					<span>{alert.text}</span>
				</div>
			)}

			<label htmlFor="login-username" className="mb-1.5 block text-[13.5px] font-medium text-slate-700">
				ชื่อผู้ใช้
			</label>
			<div className="relative mb-4">
				<User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
				<input
					id="login-username"
					ref={usernameRef}
					autoComplete="username"
					autoCapitalize="none"
					spellCheck={false}
					placeholder="username"
					className={inputCls("username")}
					value={username}
					onChange={(e) => {
						setUsername(e.target.value);
						if (invalidField === "username") setInvalidField(null);
					}}
				/>
			</div>

			<label htmlFor="login-password" className="mb-1.5 block text-[13.5px] font-medium text-slate-700">
				รหัสผ่าน
			</label>
			<div className="relative mb-2">
				<Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
				<input
					id="login-password"
					ref={passwordRef}
					type={showPassword ? "text" : "password"}
					autoComplete="current-password"
					placeholder="••••••••"
					className={inputCls("password")}
					value={password}
					onKeyUp={checkCaps}
					onKeyDown={checkCaps}
					onChange={(e) => {
						setPassword(e.target.value);
						if (invalidField === "password") setInvalidField(null);
					}}
				/>
				<button
					type="button"
					onClick={() => setShowPassword((v) => !v)}
					className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
					aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
					tabIndex={-1}
				>
					{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
				</button>
			</div>
			<p className={`mb-2 text-xs text-orange-700 ${capsLock ? "" : "invisible"}`}>⇪ เปิด Caps Lock อยู่</p>

			<label className="mb-5 flex w-fit cursor-pointer items-center gap-2 text-[13.5px] text-slate-700">
				<input
					type="checkbox"
					className="h-4 w-4 accent-[#F26B1D]"
					checked={rememberUsername}
					onChange={(e) => setRememberUsername(e.target.checked)}
				/>
				จำชื่อผู้ใช้ไว้
			</label>

			<button
				type="submit"
				disabled={isLoading}
				className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F26B1D] py-3 text-base font-semibold text-white transition hover:bg-[#E25D10] disabled:cursor-wait disabled:bg-slate-400"
			>
				{isLoading ? (
					<>
						<Loader2 size={18} className="animate-spin" />
						กำลังเข้าสู่ระบบ...
					</>
				) : (
					"เข้าสู่ระบบ"
				)}
			</button>
		</form>
	);
};

export default LoginForm;