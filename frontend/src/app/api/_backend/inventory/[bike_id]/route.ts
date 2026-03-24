import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/util/AuthOptions";

export async function GET(
  _req: Request,
  { params }: { params: { bike_id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const API_BASE = process.env.API_URL || "http://localhost:8000";
    const bikeId = params.bike_id;

    const res = await fetch(`${API_BASE}/inventory/${bikeId}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const text = await res.text();

    // ส่งต่อ status + body ตามจริง
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    console.error("API proxy error:", err);
    return NextResponse.json(
      { error: "Proxy failed" },
      { status: 500 }
    );
  }
}
