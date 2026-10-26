import { NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await database.execute("SELECT 1 AS connected");

    return NextResponse.json({
      database: "connected",
      check: result.rows[0]?.connected,
    });
  } catch {
    return NextResponse.json(
      { database: "not connected" },
      { status: 500 }
    );
  }
}