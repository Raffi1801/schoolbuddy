import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schools = await database`
      SELECT id, name, location, subjects
      FROM schools
      ORDER BY id ASC
    `;
    return NextResponse.json({ schools });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Add a new school
export async function POST(req: NextRequest) {
  try {
    const { name, location, subjects } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 });
    }

    const defaultSubjects = subjects && subjects.length > 0 
      ? JSON.stringify(subjects) 
      : JSON.stringify([
          "Telugu Books", "Hindi Books", "English Books", 
          "Mathematics Books", "Science Books", "SocialStudies Books", "NoteBooks (CW, HW, and others)"
        ]);

    const result = await database`
      INSERT INTO schools (name, location, subjects)
      VALUES (${name.trim()}, ${location || "Tuni"}, ${defaultSubjects})
      RETURNING *
    `;
    return NextResponse.json({ success: true, school: result[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Update subjects or school details
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
      RETURNING *
    `;
    return NextResponse.json({ success: true, school: updated[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Delete an entire school
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