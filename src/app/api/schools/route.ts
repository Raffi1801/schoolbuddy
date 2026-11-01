import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

// 1. Fetch only schools present in the database
export async function GET() {
  try {
    const schools = await database`
      SELECT id, name, location, subjects
      FROM schools
      ORDER BY id ASC
    `;
    return NextResponse.json({ schools: schools || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. Add a new school with whatever subjects admin specifies (empty by default)
export async function POST(req: NextRequest) {
  try {
    const { name, location, subjects } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 });
    }

    const subjectsArray = Array.isArray(subjects) ? subjects : [];

    const result = await database`
      INSERT INTO schools (name, location, subjects)
      VALUES (${name.trim()}, ${location || "Tuni"}, ${JSON.stringify(subjectsArray)})
      RETURNING id, name, location, subjects
    `;
    return NextResponse.json({ success: true, school: result[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. Update subjects list whenever admin adds or deletes a subject
export async function PATCH(req: NextRequest) {
  try {
    const { id, subjects } = await req.json();
    if (!id || !Array.isArray(subjects)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const updated = await database`
      UPDATE schools
      SET subjects = ${JSON.stringify(subjects)}
      WHERE id = ${id}
      RETURNING id, name, location, subjects
    `;
    return NextResponse.json({ success: true, school: updated[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 4. Delete a school completely
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "School id required" }, { status: 400 });
    }

    await database`DELETE FROM schools WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}