export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function getTokenFromSession(session: any): string | null {
  return (
    session?.accessToken || 
    session?.access_token ||
    session?.user?.accessToken ||
    session?.user?.access_token ||
    session?.token ||
    session?.user?.token ||
    null
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "No session - Please login" }, { status: 401 });
    }

    const token = getTokenFromSession(session);

    if (!token) {
      return NextResponse.json({ error: "No access token found", hint: "Please logout and login again" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString
      ? `${process.env.NEXT_PUBLIC_API_URL}/npg/accounts/?${queryString}`
      : `${process.env.NEXT_PUBLIC_API_URL}/npg/accounts/`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [NPG Accounts] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}