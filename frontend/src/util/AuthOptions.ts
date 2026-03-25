import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			name: "credentials",
			credentials: {
				username: {
					label: "username",
					type: "text",
				},
				password: {
					label: "password",
					type: "password",
				},
			},

			async authorize(credentials, req) {
				"use server";
				const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backend-service-production-1fc3.up.railway.app';
				const response = await fetch(`${apiUrl}/api/auth/token/`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						username: credentials?.username,
						password: credentials?.password,
					}),
				});

				if (response.ok) {
					const { access } = await response.json();
					const info = JSON.parse(atob(access.split(".")[1]));
					const user = {
						id: info.user_id,
						username: info.username,
						name: info.name,
						role: info.role,
						accessToken: access,
					};

					return user;
				}
				return null;
			},
		}),
	],
	pages: {
		signIn: "/login",
	},
	session: {
		strategy: "jwt",
		maxAge: 60 * 60 * 12, // 12 hours
	},
	callbacks: {
		async jwt({ token, user }) {
			// ✅ แก้ไข: เก็บ accessToken แยกชัดเจน
			if (user) {
				token.id = user.id;
				token.username = user.username;
				token.name = user.name;
				token.role = user.role;
				token.accessToken = user.accessToken; // ✅ เก็บไว้ใน token
			}
			return token;
		},
		async session({ session, token }) {
			// ✅ แก้ไข: ส่ง token ไปใน session
			session.user = {
				id: token.id as string,
				username: token.username as string,
				name: token.name as string,
				role: token.role as string,
				accessToken: token.accessToken as string, // ✅ ส่ง accessToken
			} as any;
			return session;
		},
	},
};