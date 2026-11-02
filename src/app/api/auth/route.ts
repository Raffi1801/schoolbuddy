import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// 1. GET Diagnostic Probe (Inspects active database & schema safely)
export async function GET() {
  try {
    // Check connection info
    const dbInfo = await database`SELECT current_database(), current_user;`;

    // Retrieve the exact columns present in the users table
    const columns = await database`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;

    // Query rows without hardcoding column names like created_at
    const users = await database`SELECT * FROM users ORDER BY 1 DESC LIMIT 10;`;

    return NextResponse.json({
      status: "connected",
      database: dbInfo[0],
      detectedColumns: columns.map((c: any) => c.column_name),
      userCount: users.length,
      users,
    });
  } catch (err: any) {
    console.error("GET /api/auth diagnostic error:", err);
    return NextResponse.json(
      {
        status: "database_error",
        message: err?.message || String(err),
        hint: err?.hint || null,
        detail: err?.detail || null,
      },
      { status: 500 }
    );
  }
}

// 2. POST Handler (Login & Auto-registration Upsert)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, name, phone, pin, password, role = "user" } = body;

    const cleanedPhone = normalizePhone(phone);
    const userSecret = (pin || password || "").toString().trim();

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

    // 1. Check existing user
    const existing = await database`
      SELECT * FROM users WHERE phone = ${cleanedPhone} LIMIT 1;
    `;

    if (existing.length > 0) {
      const user = existing[0];
      const storedSecret = user.pin || user.password || user.pin_hash;

      if (storedSecret && storedSecret !== userSecret) {
        return NextResponse.json(
          { error: "Incorrect PIN for this mobile number." },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role || "user",
        },
      });
    }

    // 2. Insert new user into Neon SQL
    const displayName = (name || "Customer").trim();
    const inserted = await database`
      INSERT INTO users (name, phone, pin, password, pin_hash, role)
      VALUES (${displayName}, ${cleanedPhone}, ${userSecret}, ${userSecret}, ${userSecret}, ${role})
      RETURNING *;
    `;

    return NextResponse.json({
      success: true,
      isNewUser: true,
      user: inserted[0],
    });
  } catch (err: any) {
    console.error("CRITICAL AUTH INSERT ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal database insertion error" },
      { status: 500 }
    );
  }
}