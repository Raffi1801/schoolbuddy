import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";
import { requireAdmin } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// 1. Fetch live settings strictly from Neon PostgreSQL (no hardcoded defaults)
export async function GET() {
  try {
    const rows = await database`
      SELECT data
      FROM app_settings
      WHERE id = 1
      LIMIT 1
    `;

    const settings = rows.length > 0 ? rows[0].data : null;
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. Save admin-modified prices, limits, and inventory permanently to Neon
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 });
    }

    const updated = await database`
      INSERT INTO app_settings (id, data, updated_at)
      VALUES (1, ${JSON.stringify(body)}::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
      RETURNING data
    `;

    return NextResponse.json({ success: true, settings: updated[0].data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}