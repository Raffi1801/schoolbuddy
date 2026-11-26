import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";
import { requireAdmin } from "@/lib/adminGuard";

export const dynamic = "force-dynamic";

// 1. Read schools, classes & books strictly from Neon (zero hardcoded fallbacks)
export async function GET() {
  try {
    const schools = await database`
      SELECT *
      FROM schools
      ORDER BY id ASC
    `;

    return NextResponse.json({ schools: schools ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. Add a new school/books entry (Admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { name, location, area, classes, subjects, books } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "School name is required" }, { status: 400 });
    }

    const inserted = await database`
      INSERT INTO schools (name, location, area, classes, subjects, books, updated_at)
      VALUES (
        ${name.trim()},
        ${location || area || ""},
        ${area || location || ""},
        ${JSON.stringify(classes ?? [])}::jsonb,
        ${JSON.stringify(subjects ?? [])}::jsonb,
        ${JSON.stringify(books ?? [])}::jsonb,
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, school: inserted[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. Modify existing school, classes, or books (Admin only)
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, name, location, area, classes, subjects, books } = body;

    if (!id) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    const updated = await database`
      UPDATE schools
      SET
        name = COALESCE(${name ?? null}, name),
        location = COALESCE(${location ?? null}, location),
        area = COALESCE(${area ?? null}, area),
        classes = COALESCE(${classes ? JSON.stringify(classes) : null}::jsonb, classes),
        subjects = COALESCE(${subjects ? JSON.stringify(subjects) : null}::jsonb, subjects),
        books = COALESCE(${books ? JSON.stringify(books) : null}::jsonb, books),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, school: updated[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 4. Delete a school entry (Admin only)
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    await database`DELETE FROM schools WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}