import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

// ✅ แก้ไข: ลบ /api ออก
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ✅ ฟังก์ชันดึง token จาก session
function getTokenFromSession(session: any): string | null {
  // ลองหา token จากหลายที่
  return (
    session?.accessToken || 
    session?.access_token ||
    session?.user?.accessToken ||
    session?.user?.access_token ||
    null
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession();
  
  if (!session) {
    console.error("❌ No session found");
    return NextResponse.json(
      { error: "No session - Please login" }, 
      { status: 401 }
    );
  }

  // ✅ ดึง token
  const token = getTokenFromSession(session);
  
  if (!token) {
    console.error("❌ No token in session");
    console.log("Session keys:", Object.keys(session));
    console.log("Session user:", session.user);
    return NextResponse.json(
      { 
        error: "No access token found in session",
        hint: "Please logout and login again",
        sessionKeys: Object.keys(session)
      }, 
      { status: 401 }
    );
  }

  const path = params.path.join("/");
  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  
  // ✅ แก้ไข: ใช้ API_URL ที่ไม่มี /api แล้ว
  const url = `${API_URL}/npg/${path}${queryString ? `?${queryString}` : ""}`;

  console.log("🔍 NPG API Request:", {
    url,
    path,
    hasToken: !!token,
    tokenPreview: token.substring(0, 20) + "...",
  });

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    console.log("📡 NPG API Response:", {
      status: response.status,
      statusText: response.statusText,
      url
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ NPG API Error Response:", errorText);
      
      return NextResponse.json(
        { 
          error: "Backend API error",
          status: response.status,
          details: errorText,
          url
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("✅ NPG API Success:", {
      dataType: Array.isArray(data) ? "array" : typeof data,
      dataLength: Array.isArray(data) ? data.length : "N/A"
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ NPG API Fetch Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to connect to backend",
        message: error instanceof Error ? error.message : "Unknown error",
        backendUrl: API_URL,
        attemptedUrl: url
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession();
  
  if (!session) {
    console.error("❌ POST: No session found");
    return NextResponse.json(
      { error: "No session - Please login" }, 
      { status: 401 }
    );
  }

  const token = getTokenFromSession(session);
  
  if (!token) {
    console.error("❌ POST: No token in session");
    return NextResponse.json(
      { error: "No access token - Please logout and login again" }, 
      { status: 401 }
    );
  }

  const path = params.path.join("/");
  const url = `${API_URL}/npg/${path}`;
  const body = await request.json();

  console.log("🔍 NPG API POST Request:", {
    url,
    bodyKeys: Object.keys(body),
    hasToken: !!token
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("📡 NPG API POST Response:", {
      status: response.status,
      success: response.ok,
      url
    });

    if (!response.ok) {
      console.error("❌ POST Error:", data);
    }
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("❌ NPG API POST Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to send data to backend",
        message: error instanceof Error ? error.message : "Unknown error",
        attemptedUrl: url
      },
      { status: 500 }
    );
  }
}