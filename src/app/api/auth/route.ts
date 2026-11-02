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

    // 1. Send OTP
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

    // 2. Check if user already exists
    const existing = await database`
      SELECT id, name, phone, role,
             COALESCE(pin, password, pin_hash) AS stored_secret
      FROM users 
      WHERE phone = ${cleanedPhone} 
      LIMIT 1;
    `;

    if (existing.length > 0) {
      const user = existing[0];
      if (user.stored_secret && user.stored_secret !== userSecret) {
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

    // 3. New User Insertion into Neon
    const displayName = (name || "Customer").trim();
    const inserted = await database`
      INSERT INTO users (name, phone, pin, password, pin_hash, role)
      VALUES (${displayName}, ${cleanedPhone}, ${userSecret}, ${userSecret}, ${userSecret}, ${role})
      RETURNING id, name, phone, role;
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