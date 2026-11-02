import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.toString().replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}
    
// 2. POST Handler (Login & Auto-registration Upsert)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, name, phone, pin, password, role = "user" } = body;

    const cleanedPhone = normalizePhone(phone);
    const userSecret = (pin ?? password ?? "").toString().trim();

    // OTP Handshake Route
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

    // Validation
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

    // 2. Insert new user dynamically based on columns that exist
    const displayName = (name || "Customer").toString().trim();

    const columnRows = await database`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;
    const colSet = new Set(columnRows.map((c: any) => c.column_name.toLowerCase()));

    // Fallback safe queries depending on available columns
    let insertedUser: any = null;

    if (colSet.has("pin") && colSet.has("password") && colSet.has("pin_hash") && colSet.has("role")) {
      const res = await database`
        INSERT INTO users (name, phone, pin, password, pin_hash, role)
        VALUES (${displayName}, ${cleanedPhone}, ${userSecret}, ${userSecret}, ${userSecret}, ${role})
        RETURNING *;
      `;
      insertedUser = res[0];
    } else if (colSet.has("pin") && colSet.has("role")) {
      const res = await database`
        INSERT INTO users (name, phone, pin, role)
        VALUES (${displayName}, ${cleanedPhone}, ${userSecret}, ${role})
        RETURNING *;
      `;
      insertedUser = res[0];
    } else {
      const res = await database`
        INSERT INTO users (name, phone, pin)
        VALUES (${displayName}, ${cleanedPhone}, ${userSecret})
        RETURNING *;
      `;
      insertedUser = res[0];
    }

    return NextResponse.json({
      success: true,
      isNewUser: true,
      user: {
        id: insertedUser.id,
        phone: insertedUser.phone,
        name: insertedUser.name,
        role: insertedUser.role || "user",
      },
    });
  } catch (err: any) {
    console.error("CRITICAL AUTH ROUTE ERROR:", err);
    return NextResponse.json(
      {
        error: err?.message || "Internal database insertion error",
        code: err?.code || null,
        detail: err?.detail || null,
      },
      { status: 500 }
    );
  }
}