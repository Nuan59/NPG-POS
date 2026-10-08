import NextAuth, { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL =
	process.env.API_URL ||
	process.env.NEXT_PUBLIC_API_URL ||
	"https://backend-service-production-1fc3.up.railway.app";

// ต่ออายุ access token ล่วงหน้าก่อนหมดอายุจริง (กันหมดกลางทางระหว่างกำลังยิง API)
const REFRESH_BEFORE_MS = 5 * 60 * 1000;
// อายุการล็อกอินฝั่งเว็บ = อายุ refresh token ของ backend (SIMPLE_JWT.REFRESH_TOKEN_LIFETIME = 5 วัน)
const SESSION_MAX_AGE_SECONDS = 5 * 24 * 60 * 60;

/** อ่าน payload ของ JWT (base64url + รองรับตัวอักษรไทย) */
const decodeJwt = (token: string): Record<string, any> => {
	try {
		const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
		return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
	} catch {
		return {};
	}
};

/** เวลาหมดอายุของ access token (ms) จาก claim exp */
const getExpiry = (accessToken?: string): number => {
	const exp = accessToken ? decodeJwt(accessToken).exp : undefined;
	return typeof exp === "number" ? exp * 1000 : 0;
};

/**
 * ขอ access token ใหม่ด้วย refresh token
 * - backend ปฏิเสธ (refresh หมดอายุ/ใช้ไม่ได้) → ติด error ให้หน้าเว็บพาไปล็อกอินใหม่
 * - เน็ต/เซิร์ฟเวอร์ล่มชั่วคราว → คืน token เดิมไว้ก่อน (ลองใหม่รอบหน้า) ไม่เตะผู้ใช้ออกเพราะเน็ตกระตุก
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
	if (!token.refreshToken) {
		return { ...token, error: "RefreshAccessTokenError" };
	}

	try {
		const res = await fetch(`${API_URL}/auth/token/refresh/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ refresh: token.refreshToken }),
			cache: "no-store",
		});

		if (res.status === 400 || res.status === 401) {
			return { ...token, error: "RefreshAccessTokenError" };
		}
		if (!res.ok) {
			return token;
		}

		const data = await res.json();
		return {
			...token,
			accessToken: data.access,
			accessTokenExpires: getExpiry(data.access),
			// ถ้า backend เปิด ROTATE_REFRESH_TOKENS จะได้ refresh ใหม่มาด้วย
			refreshToken: data.refresh ?? token.refreshToken,
			error: undefined,
		};
	} catch (error) {
		console.error("❌ refreshAccessToken network error:", error);
		return token;
	}
}

export const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			name: "credentials",
			credentials: {
				username: { label: "username", type: "text" },
				password: { label: "password", type: "password" },
			},
			async authorize(credentials) {
				let response: Response;
				try {
					response = await fetch(`${API_URL}/auth/token/`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							username: credentials?.username,
							password: credentials?.password,
						}),
						cache: "no-store",
					});
				} catch {
					// หน้าล็อกอินแปลข้อความนี้เป็น "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
					throw new Error("network_error");
				}

				if (response.ok) {
					const { access, refresh } = await response.json();
					const info = decodeJwt(access);
					return {
						id: info.user_id,
						username: info.username,
						name: info.name,
						role: info.role,
						accessToken: access,
						refreshToken: refresh,
						accessTokenExpires: getExpiry(access),
					} as any;
				}

				if (response.status === 401) {
					const errData = await response.json().catch(() => null);
					if (errData?.detail === "outside_working_hours") {
						throw new Error(
							`ไม่อยู่ในเวลางาน กรุณาเข้าระบบระหว่าง ${errData.start} - ${errData.end} น.`
						);
					}
				}

				// รหัสผิด → next-auth ส่ง error "CredentialsSignin"
				return null;
			},
		}),
	],
	pages: { signIn: "/login" },
	session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
	callbacks: {
		async jwt({ token, user }) {
			// ล็อกอินครั้งแรก
			if (user) {
				const u = user as any;
				return {
					...token,
					id: u.id,
					username: u.username,
					name: u.name,
					role: u.role,
					accessToken: u.accessToken,
					refreshToken: u.refreshToken,
					accessTokenExpires: u.accessTokenExpires,
					error: undefined,
				};
			}

			// session เก่า (ก่อนอัปเดต) ไม่มีเวลาหมดอายุเก็บไว้ - อ่านจาก access token เอา
			const expires = token.accessTokenExpires || getExpiry(token.accessToken);

			// ยังไม่ใกล้หมด → ใช้ต่อ
			if (expires && Date.now() < expires - REFRESH_BEFORE_MS) {
				return { ...token, accessTokenExpires: expires };
			}

			// ใกล้หมด/หมดแล้ว → ต่ออายุ
			return refreshAccessToken({ ...token, accessTokenExpires: expires });
		},
		async session({ session, token }) {
			session.user = {
				id: token.id as any,
				username: token.username as string,
				name: token.name as string,
				role: token.role as string,
				accessToken: token.accessToken as string,
			};
			// เผื่อโค้ดเก่าที่อ่าน session.accessToken ตรงๆ
			session.accessToken = token.accessToken as string;
			// ต่ออายุไม่ได้ → AuthProvider จะพาไปหน้าล็อกอิน
			session.error = token.error;
			return session;
		},
	},
};

export default NextAuth(authOptions);