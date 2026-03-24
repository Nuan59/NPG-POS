import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ✅ ฟังก์ชันดึง token จาก session (ลองหลายที่)
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

    console.log("🔍 [NPG Accounts] Session check:", {
      hasSession: !!session,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : []
    });

    if (!session) {
      console.error("❌ [NPG Accounts] No session");
      return NextResponse.json(
        { error: "No session - Please login" },
        { status: 401 }
      );
    }

    const token = getTokenFromSession(session);

    if (!token) {
      console.error("❌ [NPG Accounts] No token found");
      console.log("Session structure:", JSON.stringify(session, null, 2));
      return NextResponse.json(
        { 
          error: "No access token found",
          hint: "Please logout and login again",
          debug: {
            hasSession: true,
            sessionKeys: Object.keys(session),
            userKeys: session.user ? Object.keys(session.user) : []
          }
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString
      ? `${process.env.NEXT_PUBLIC_API_URL}/npg/accounts/?${queryString}`
      : `${process.env.NEXT_PUBLIC_API_URL}/npg/accounts/`;

    console.log("📡 [NPG Accounts] Fetching:", url);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    console.log("✅ [NPG Accounts] Response:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("❌ [NPG Accounts] Backend error:", errorData);
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("✅ [NPG Accounts] Success - Items:", Array.isArray(data) ? data.length : "not array");
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [NPG Accounts] Error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}