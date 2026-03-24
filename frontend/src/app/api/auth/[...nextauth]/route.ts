import { authOptions } from "@/util/AuthOptions";
import NextAuth from "next-auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// ✅ Export authOptions เพื่อให้ API routes อื่นใช้ได้
export { authOptions };