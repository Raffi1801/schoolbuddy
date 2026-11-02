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
      SELECT id, name, phone, role,
             COALESCE(pin, password, pin_hash) AS stored_secret
      FROM users 
      WHERE phone = ${cleanedPhone} 
      LIMIT 1;
    `;

    if (existing && existing.length > 0) {
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

    // 2. Perform fresh insertion with all field backups
    const displayName = (name || "Customer").trim();

    const inserted = await database`
      INSERT INTO users (name, phone, pin, password, pin_hash, role)
      VALUES (
        ${displayName},
        ${cleanedPhone},
        ${userSecret},
        ${userSecret},
        ${userSecret},
        ${role}
      )
      RETURNING *;
    `;

    console.log("INSERTION SUCCESSFUL. NEW ROW:", JSON.stringify(inserted));

    return NextResponse.json({
      success: true,
      isNewUser: true,
      user: inserted[0],
    });
  } catch (err: any) {
    console.error("NEON SQL INSERTION ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Database write failed" },
      { status: 500 }
    );
  }
}