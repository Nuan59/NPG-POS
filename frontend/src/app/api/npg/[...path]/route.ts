import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/util/AuthOptions";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ✅ ต้องส่ง authOptions เข้า getServerSession เสมอ
// (เดิมไม่ได้ส่ง → session ไม่มี accessToken → ได้ 401 ทุกครั้ง)
async function getToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.accessToken ?? null;
}

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
  }

  const path = params.path.join("/");
  const queryString = new URL(request.url).searchParams.toString();
  const url = `${API_URL}/npg/${path}${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("❌ NPG API GET error:", response.status, url);
      return NextResponse.json({ error: "Backend API error", status: response.status, details }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("❌ NPG API GET fetch error:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
  }

  const path = params.path.join("/");
  const url = `${API_URL}/npg/${path}`;

  try {
    const body = await request.json();
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) console.error("❌ NPG API POST error:", response.status, url);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("❌ NPG API POST fetch error:", error);
    return NextResponse.json(
      { error: "Failed to send data to backend", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}