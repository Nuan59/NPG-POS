export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function GET(request: Request) {
  try {
    // ✅ ดึง token จาก Authorization header ที่ frontend ส่งมา
    const authHeader = request.headers.get("Authorization");

    const response = await fetch(`${API_BASE_URL}/storage/`, {
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Backend /storage/ returned: ${response.status}`);
      throw new Error(`Backend error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Storage API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch storage" },
      { status: 500 }
    );
  }
}