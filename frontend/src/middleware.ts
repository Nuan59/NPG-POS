import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const adminRoutes = ["/employees" , "/reports"];

    if (
      adminRoutes.some((item) => req.nextUrl.pathname.startsWith(item)) &&
      req.nextauth.token?.role !== "adm"
    ) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?unauthorized`
      );
    }
  },
  {
    callbacks: {
      authorized: (params) => {
        const { token, req } = params;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/customers/:path*",
    "/dashboard/:path*",
    "/employees/:path*",
    "/inventory/:path*",
    "/sales/:path*",
    "/storage/:path*",
    "/reports/:path*",
  ],
};
