import { NextResponse } from "next/server";
import { getCustomers } from "@/services/CustomerService";

export async function GET() {
  try {
    const customers = await getCustomers();
    return NextResponse.json(customers);
  } catch (error) {
    console.error("❌ API /api/customers error:", error);
    return NextResponse.json([], { status: 500 });
  }
}