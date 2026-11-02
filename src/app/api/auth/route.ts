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
    const { action, name, phone, pin, password, role = "user" } = body;

    const cleanedPhone = normalizePhone(phone);
    const userSecret = (pin || password || "").toString().trim();

    // 1. Send OTP (Demo code 1234)
    if (action === "send_otp") {
      if (!cleanedPhone || cleanedPhone.length !== 10) {
        return NextResponse.json(
          { error: "A valid 10-digit mobile number is required." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: true, message: "OTP sent successfully", debugOtp: "1234" },
        { status: 200 }
      );
    }

    // Validation for credentials
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      return NextResponse.json(
        { error: "A valid 10-digit mobile number is required." },
        { status: 400 }
      );
    }

    if (!userSecret) {
      return NextResponse.json(
        { error: "A 4-digit PIN is required." },
        { status: 400 }
      );
    }

    // 2. Explicit Sign Up / Register
    if (action === "signup" || action === "register") {
      const existing = await database`
        SELECT id FROM users WHERE phone = ${cleanedPhone} LIMIT 1;
      `;
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "User already exists with this mobile number. Please sign in." },
          { status: 409 }
        );
      }

      const result = await database`
        INSERT INTO users (name, phone, pin, role)
        VALUES (${(name || "Customer").trim()}, ${cleanedPhone}, ${userSecret}, ${role})
        RETURNING id, name, phone, role;
      `;

      return NextResponse.json(
        { success: true, user: result[0] },
        { status: 201 }
      );
    }

    // 3. Reset PIN
    if (action === "reset_pin") {
      const updated = await database`
        UPDATE users 
        SET pin = ${userSecret}
        WHERE phone = ${cleanedPhone}
        RETURNING id, name, phone, role;
      `;

      if (updated.length === 0) {
        return NextResponse.json(
          { error: "No account found with this phone number." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: true, user: updated[0] },
        { status: 200 }
      );
    }

    // 4. User verification check
    if (action === "check_user") {
      const rows = await database`
        SELECT id, name, phone, role 
        FROM users 
        WHERE phone = ${cleanedPhone} 
        LIMIT 1;
      `;
      return NextResponse.json({ user: rows[0] || null }, { status: 200 });
    }

    // 5. Login / Sign In & Seamless Auto-Register (When no action or action === "login"/"signin")
    const rows = await database`
      SELECT id, name, phone, pin, role 
      FROM users 
      WHERE phone = ${cleanedPhone} 
      LIMIT 1;
    `;

    if (rows.length > 0) {
      const user = rows[0];

      // Verify PIN against stored value
      if (user.pin && user.pin !== userSecret) {
        return NextResponse.json(
          { error: "Incorrect PIN for this mobile number." },
          { status: 401 }
        );
      }

      const { pin: _, ...safeUser } = user;
      return NextResponse.json(
        { success: true, user: safeUser },
        { status: 200 }
      );
    }

    // Auto-create new user if logging in for the first time
    const displayName = (name || "Customer").trim();
    const inserted = await database`
      INSERT INTO users (name, phone, pin, role)
      VALUES (${displayName}, ${cleanedPhone}, ${userSecret}, ${role})
      RETURNING id, name, phone, role;
    `;

    return NextResponse.json(
      { success: true, isNewUser: true, user: inserted[0] },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}