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
    const userSecret = pin || password;

    // 1. Send OTP (Demo code 1234)
    if (action === "send_otp") {
      if (!cleanedPhone || cleanedPhone.length !== 10) {
        return NextResponse.json(
          { error: "A valid 10-digit mobile number is required." },
          { status: 400 }
        );
      }

      // Return a demo OTP for local/cloud testing
      const demoOtp = "1234";
      return NextResponse.json(
        { success: true, message: "OTP sent successfully", debugOtp: demoOtp },
        { status: 200 }
      );
    }

    // 2. Sign Up / Register
    if (action === "signup" || action === "register") {
      if (!name || !cleanedPhone || !userSecret) {
        return NextResponse.json(
          { error: "Name, phone, and 4-digit PIN are required." },
          { status: 400 }
        );
      }

      const existing = await database`
        SELECT id FROM users WHERE phone = ${cleanedPhone} LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "User already exists with this mobile number. Please sign in." },
          { status: 409 }
        );
      }

      const result = await database`
        INSERT INTO users (name, phone, password, pin_hash, role)
        VALUES (${name.trim()}, ${cleanedPhone}, ${userSecret}, ${userSecret}, ${role})
        RETURNING id, name, phone, role
      `;

      return NextResponse.json(
        { success: true, user: result[0] },
        { status: 201 }
      );
    }

    // 3. Login / Sign In
    if (action === "login" || action === "signin") {
      if (!cleanedPhone || !userSecret) {
        return NextResponse.json(
          { error: "Phone number and PIN are required." },
          { status: 400 }
        );
      }

      const rows = await database`
        SELECT id, name, phone, password, pin_hash, role 
        FROM users 
        WHERE phone = ${cleanedPhone} 
        LIMIT 1
      `;
      const user = rows[0];

      const savedSecret = user?.password || user?.pin_hash;
      if (!user || savedSecret !== userSecret) {
        return NextResponse.json(
          { error: "Invalid phone number or PIN." },
          { status: 401 }
        );
      }

      const { password: _, pin_hash: __, ...safeUser } = user;
      return NextResponse.json(
        { success: true, user: safeUser },
        { status: 200 }
      );
    }

    // 4. Reset PIN
    if (action === "reset_pin") {
      if (!cleanedPhone || !userSecret) {
        return NextResponse.json(
          { error: "Phone number and new PIN are required." },
          { status: 400 }
        );
      }

      const updated = await database`
        UPDATE users 
        SET password = ${userSecret}
        WHERE phone = ${cleanedPhone}
        RETURNING id, name, phone, role
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

    // 5. User verification check
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