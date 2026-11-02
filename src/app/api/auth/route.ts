import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phone = (body.phone || "").replace(/\D/g, "").slice(-10);
    const pin = (body.pin || "").trim();
    const name = (body.name || "Customer").trim();

    if (phone.length !== 10) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    if (!pin) {
      return NextResponse.json(
        { error: "PIN is required." },
        { status: 400 }
      );
    }

    // 1. Check if user already exists
    const existing = await database`
      SELECT id, phone, name, pin, role 
      FROM users 
      WHERE phone = ${phone}
      LIMIT 1
    `;

    if (existing.length > 0) {
      const user = existing[0];
      // If user exists, verify PIN
      if (user.pin && user.pin !== pin) {
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

    // 2. If new user, automatically register and insert into Neon SQL
    const inserted = await database`
      INSERT INTO users (phone, name, pin, role)
      VALUES (${phone}, ${name}, ${pin}, 'user')
      RETURNING id, phone, name, role
    `;

    return NextResponse.json({
      success: true,
      isNewUser: true,
      user: inserted[0],
    });
  } catch (err: any) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { error: err.message || "Authentication failed." },
      { status: 500 }
    );
  }
}