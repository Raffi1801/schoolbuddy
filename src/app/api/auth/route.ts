import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, name, phone, password, role = "user" } = body;

    const cleanedPhone = normalizePhone(phone);

    // 1. Sign up / Register
    if (action === "register" || action === "signup") {
      if (!name || !cleanedPhone || !password) {
        return NextResponse.json(
          { error: "Name, valid phone, and password are required." },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existing = await database`
        SELECT id FROM users WHERE phone = ${cleanedPhone} LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "An account with this phone number already exists." },
          { status: 409 }
        );
      }

      // Insert new user
      const result = await database`
        INSERT INTO users (name, phone, password, role)
        VALUES (${name.trim()}, ${cleanedPhone}, ${password}, ${role})
        RETURNING id, name, phone, role
      `;

      return NextResponse.json(
        { success: true, user: result[0] },
        { status: 201 }
      );
    }

    // 2. Sign in / Login
    if (action === "login" || action === "signin") {
      if (!cleanedPhone || !password) {
        return NextResponse.json(
          { error: "Phone number and password are required." },
          { status: 400 }
        );
      }

      const rows = await database`
        SELECT id, name, phone, password, role 
        FROM users 
        WHERE phone = ${cleanedPhone} 
        LIMIT 1
      `;
      const user = rows[0];

      if (!user || user.password !== password) {
        return NextResponse.json(
          { error: "Invalid phone number or password." },
          { status: 401 }
        );
      }

      const { password: _, ...safeUser } = user;
      return NextResponse.json(
        { success: true, user: safeUser },
        { status: 200 }
      );
    }

    // 3. Admin / direct check
    if (action === "check_user") {
      const rows = await database`
        SELECT id, name, phone, role 
        FROM users 
        WHERE phone = ${cleanedPhone} 
        LIMIT 1
      `;
      return NextResponse.json({ user: rows[0] || null }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}