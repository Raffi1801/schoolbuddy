import { NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await database`SELECT NOW() as current_time;`;
    return NextResponse.json({ status: "connected", time: result[0]?.current_time });
  } catch (error: any) {
    return NextResponse.json({ status: "failed", error: error.message }, { status: 500 });
  }
}