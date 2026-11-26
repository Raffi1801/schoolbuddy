import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function requireAdmin(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized: Admin login required." },
        { status: 401 }
      ),
    };
  }

  const session = await verifySessionToken(token);
  if (!session || session.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Administrator privileges required." },
        { status: 403 }
      ),
    };
  }

  return { session };
}