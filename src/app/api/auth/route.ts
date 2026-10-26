import { NextRequest, NextResponse } from "next/server";
import db from "@/database";

export const dynamic = "force-dynamic";

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Check if a user exists / retrieve account profile
export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const cleanedPhone = normalizePhone(phone);
    const user: any = db
      .prepare("SELECT id, name, phone, created_at FROM users WHERE phone = ?")
      .get(cleanedPhone);

    if (!user) {
      return NextResponse.json({ exists: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ exists: true, user }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, name, phone, pin } = body;

    const cleanedPhone = normalizePhone(phone);

    if (!cleanedPhone || !pin) {
      return NextResponse.json(
        { error: "Phone number and PIN are required" },
        { status: 400 }
      );
    }

    // 1. SIGNUP / REGISTER
    if (action === "register" || action === "signup") {
      const existingUser = db
        .prepare("SELECT id FROM users WHERE phone = ?")
        .get(cleanedPhone);

      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this mobile number already exists." },
          { status: 409 }
        );
      }

      const userName = (name || "Customer").trim();

      const insertStmt = db.prepare(`
        INSERT INTO users (name, phone, pin_hash)
        VALUES (?, ?, ?)
      `);

      const result = insertStmt.run(userName, cleanedPhone, String(pin));
      const createdUser: any = db
        .prepare("SELECT id, name, phone, created_at FROM users WHERE id = ?")
        .get(result.lastInsertRowid);

      return NextResponse.json(
        {
          success: true,
          user: createdUser,
        },
        { status: 201 }
      );
    }

    // 2. LOGIN
    if (action === "login") {
      const user: any = db
        .prepare("SELECT * FROM users WHERE phone = ?")
        .get(cleanedPhone);

      if (!user) {
        return NextResponse.json(
          { error: "Account not found. Please sign up first." },
          { status: 404 }
        );
      }

      if (String(user.pin_hash) !== String(pin)) {
        return NextResponse.json(
          { error: "Incorrect PIN entered." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            created_at: user.created_at,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'login' or 'signup'." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("POST /api/auth error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}