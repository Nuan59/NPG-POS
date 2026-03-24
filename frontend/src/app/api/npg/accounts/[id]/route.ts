import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ✅ ฟังก์ชันดึง token จาก session
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "No session" },
        { status: 401 }
      );
    }

    const token = getTokenFromSession(session);

    if (!token) {
      return NextResponse.json(
        { error: "No access token" },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/npg/accounts/${params.id}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in NPG detail API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "No session" },
        { status: 401 }
      );
    }

    const token = getTokenFromSession(session);

    if (!token) {
      return NextResponse.json(
        { error: "No access token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const action = body.action; // 'record_payment' or 'close_account'

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/npg/accounts/${params.id}/${action}/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in NPG action API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}