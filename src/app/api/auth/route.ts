import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { database } from "@/database";

export const dynamic = "force-dynamic";

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.toString().replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, name, phone, pin, password } = body;

    const cleanedPhone = normalizePhone(phone);
    const userSecret = (pin ?? password ?? "").toString().trim();

    // 1. OTP Handshake Route
    if (action === "send_otp") {
      if (!cleanedPhone || cleanedPhone.length !== 10) {
        return NextResponse.json(
          { error: "A valid 10-digit mobile number is required." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "OTP sent successfully",
          ...(process.env.NODE_ENV !== "production" ? { debugOtp: "1234" } : {}),
        },
        { status: 200 }
      );
    }

    // 2. Input Validation
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      return NextResponse.json(
        { error: "A valid 10-digit mobile number is required." },
        { status: 400 }
      );
    }

    if (!/^\d{4,6}$/.test(userSecret)) {
      return NextResponse.json(
        { error: "A valid 4 to 6 digit numeric PIN is required." },
        { status: 400 }
      );
    }

    // 3. Check Existing User
    const existing = await database`
      SELECT * FROM users WHERE phone = ${cleanedPhone} LIMIT 1;
    `;

    if (existing.length > 0) {
      const user = existing[0];
      const storedHash: string | null = user.pin_hash || null;
      const legacyPlaintext: string | null = user.pin || user.password || null;

      let isValid = false;

      if (storedHash && storedHash.startsWith("$2")) {
        // Modern bcrypt hash verification
        isValid = await bcrypt.compare(userSecret, storedHash);
      } else if (legacyPlaintext) {
        // Legacy plaintext verification + automatic migration to bcrypt
        isValid = legacyPlaintext === userSecret;
        if (isValid) {
          const upgradedHash = await bcrypt.hash(userSecret, 10);
          await database`
            UPDATE users
            SET pin_hash = ${upgradedHash}, pin = NULL, password = NULL
            WHERE id = ${user.id};
          `;
        }
      }

      if (!isValid) {
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

    // 4. Register New User with Hashed PIN (force role = 'user' for public signups)
    const displayName = (name || "Customer").toString().trim();
    const hashedPin = await bcrypt.hash(userSecret, 10);
    const assignedRole = "user";

    const columnRows = await database`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;
    const colSet = new Set(columnRows.map((c: Record<string, string>) => c.column_name.toLowerCase()));

    let insertedUser: Record<string, unknown> | null = null;

    if (colSet.has("pin_hash") && colSet.has("role")) {
      const res = await database`
        INSERT INTO users (name, phone, pin_hash, role)
        VALUES (${displayName}, ${cleanedPhone}, ${hashedPin}, ${assignedRole})
        RETURNING id, name, phone, role;
      `;
      insertedUser = res[0];
    } else if (colSet.has("pin_hash")) {
      const res = await database`
        INSERT INTO users (name, phone, pin_hash)
        VALUES (${displayName}, ${cleanedPhone}, ${hashedPin})
        RETURNING id, name, phone;
      `;
      insertedUser = res[0];
    } else {
      // Fallback if pin_hash column doesn't exist yet: store hash in pin
      const res = await database`
        INSERT INTO users (name, phone, pin)
        VALUES (${displayName}, ${cleanedPhone}, ${hashedPin})
        RETURNING id, name, phone;
      `;
      insertedUser = res[0];
    }

    return NextResponse.json({
      success: true,
      isNewUser: true,
      user: {
        id: insertedUser?.id,
        phone: insertedUser?.phone,
        name: insertedUser?.name,
        role: (insertedUser?.role as string) || "user",
      },
    });
  } catch (err: unknown) {
    console.error("CRITICAL AUTH ROUTE ERROR:", err);
    const message = err instanceof Error ? err.message : "Internal authentication error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}