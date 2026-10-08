import NextAuth from "next-auth/next";

declare module "next-auth" {
	interface Session {
		user: {
			id: number;
			username: string;
			name: string;
			role: string;
			accessToken: string;
		};
		/** สำเนาของ user.accessToken (เผื่อโค้ดเก่าที่อ่านตรงนี้) */
		accessToken?: string;
		/** "RefreshAccessTokenError" = ต่ออายุไม่ได้ ต้องล็อกอินใหม่ */
		error?: "RefreshAccessTokenError";
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		id?: number;
		username?: string;
		name?: string;
		role?: string;
		accessToken?: string;
		refreshToken?: string;
		/** เวลาหมดอายุของ access token (ms) */
		accessTokenExpires?: number;
		error?: "RefreshAccessTokenError";
	}
}