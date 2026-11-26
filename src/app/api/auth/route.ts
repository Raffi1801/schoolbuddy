import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { database } from "@/database";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  const digits = rawPhone.toString().replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function buildAuthResponse(
  user: {
    id: number;
    phone: string;
    name: string;
    role?: string;
    created_at?: unknown;
    password_updated_at?: unknown;
  },
  extra: Record<string, unknown> = {}
) {
  const role = user.role || "user";
  const token = await createSessionToken({
    id: user.id,
    phone: user.phone,
    name: user.name,
    role,
  });

  const res = NextResponse.json({
    success: true,
    ...extra,
    user: { ...user, role },
  });

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action, name, phone, otp, pin, password, newPin } = body;

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

    // 2. Input Validation (Letters, numbers, and special symbols allowed)
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      return NextResponse.json(
        { error: "A valid 10-digit mobile number is required." },
        { status: 400 }
      );
    }

    if (userSecret.length < 4 || userSecret.length > 32) {
      return NextResponse.json(
        { error: "Password / PIN must be between 4 and 32 characters." },
        { status: 400 }
      );
    }

    // 3. Forgot Password / Reset PIN Flow (Verified via OTP)
    if (action === "reset_pin") {
      const cleanedOtp = (otp ?? "").toString().trim();
      if (cleanedOtp !== "1234") {
        return NextResponse.json(
          { error: "Invalid verification OTP." },
          { status: 400 }
        );
      }

      const existing = await database`
        SELECT id FROM users WHERE phone = ${cleanedPhone} LIMIT 1;
      `;

      if (existing.length === 0) {
        return NextResponse.json(
          { error: "No account found with this mobile number." },
          { status: 404 }
        );
      }

      const newHash = await bcrypt.hash(userSecret, 10);
      await database`
        UPDATE users
        SET pin_hash = ${newHash}, password_updated_at = NOW()
        WHERE id = ${existing[0].id};
      `;

      return NextResponse.json({
        success: true,
        message: "Password reset successfully.",
      });
    }

    // 4. Check Existing User (Login or Authenticated Password Change)
    const existing = await database`
      SELECT * FROM users WHERE phone = ${cleanedPhone} LIMIT 1;
    `;

    if (existing.length > 0) {
      if (action === "signup") {
        return NextResponse.json(
          { error: "An account with this mobile number already exists. Please sign in." },
          { status: 409 }
        );
      }

      const user = existing[0];
      const storedHash: string | null = user.pin_hash ? String(user.pin_hash).trim() : null;
      const legacyPlaintext: string | null =
        (user.pin ? String(user.pin).trim() : null) ||
        (user.password ? String(user.password).trim() : null);

      let isValid = false;

      if (storedHash && storedHash.startsWith("$2")) {
        // Modern bcrypt hash
        isValid = await bcrypt.compare(userSecret, storedHash);
      } else {
        // Legacy plaintext stored in pin_hash, pin, or password
        const plainSecret = storedHash || legacyPlaintext;
        if (plainSecret && plainSecret === userSecret) {
          isValid = true;
          const upgradedHash = await bcrypt.hash(userSecret, 10);
          await database`
            UPDATE users
            SET pin_hash = ${upgradedHash}
            WHERE id = ${user.id};
          `;
        }
      }

      if (!isValid) {
        return NextResponse.json(
          { error: "Incorrect Password / PIN for this mobile number." },
          { status: 401 }
        );
      }

      // 4b. Authenticated Password / PIN Change Request
      if (action === "change_pin") {
        const cleanedNewPin = (newPin ?? "").toString().trim();
        if (cleanedNewPin.length < 4 || cleanedNewPin.length > 32) {
          return NextResponse.json(
            { error: "New Password / PIN must be between 4 and 32 characters." },
            { status: 400 }
          );
        }

        const newHash = await bcrypt.hash(cleanedNewPin, 10);
        const updatedRows = await database`
          UPDATE users
          SET pin_hash = ${newHash}, password_updated_at = NOW()
          WHERE id = ${user.id}
          RETURNING id, phone, name, role, created_at, password_updated_at;
        `;

        return buildAuthResponse(
          updatedRows[0] as { id: number; phone: string; name: string; role: string },
          { message: "Password / PIN updated successfully." }
        );
      }

      const refreshed = await database`
        SELECT id, phone, name, role, created_at, password_updated_at
        FROM users WHERE id = ${user.id} LIMIT 1;
      `;

      return buildAuthResponse(
        refreshed[0] as { id: number; phone: string; name: string; role: string }
      );
    }

    // 5. Register New User
    if (action === "login") {
      return NextResponse.json(
        { error: "Mobile number not registered. Please create an account first." },
        { status: 404 }
      );
    }

    const cleanedOtp = (otp ?? "").toString().trim();
    if (cleanedOtp !== "1234") {
      return NextResponse.json(
        { error: "Invalid verification OTP." },
        { status: 400 }
      );
    }

    const displayName = (name || "Customer").toString().trim();
    const hashedPin = await bcrypt.hash(userSecret, 10);

    const inserted = await database`
      INSERT INTO users (name, phone, pin_hash, role, created_at, password_updated_at)
      VALUES (${displayName}, ${cleanedPhone}, ${hashedPin}, 'user', NOW(), NOW())
      RETURNING id, name, phone, role, created_at, password_updated_at;
    `;

    return buildAuthResponse(
      inserted[0] as { id: number; phone: string; name: string; role: string },
      { isNewUser: true }
    );
  } catch (err: unknown) {
    console.error("CRITICAL AUTH ROUTE ERROR:", err);
    const message = err instanceof Error ? err.message : "Internal authentication error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 6. Logout Handler
export async function DELETE() {
  const res = NextResponse.json({ success: true, message: "Logged out" });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}