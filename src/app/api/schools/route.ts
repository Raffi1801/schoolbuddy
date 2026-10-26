import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface SchoolItem {
  id: string;
  name: string;
  area: string;
  subjects?: string[];
}

const defaultSubjects = [
  "Telugu Books",
  "Hindi Books",
  "English Books",
  "Mathematics Books",
  "Science Books",
  "SocialStudies Books",
  "NoteBooks (CW, HW, and others)",
];

let inMemorySchools: SchoolItem[] = [
  { id: "sri-prakash", name: "Sri Prakash Vidya Niketan", area: "Tuni", subjects: defaultSubjects },
  { id: "loyola", name: "Loyola English Medium School", area: "Tuni", subjects: defaultSubjects },
  { id: "st-ann", name: "St. Ann's High School", area: "Tuni", subjects: defaultSubjects },
];

export async function GET() {
  return NextResponse.json({ schools: inMemorySchools });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, area, subjects } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "School name is required" }, { status: 400 });
    }

    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    let parsedSubjects: string[] = defaultSubjects;
    if (Array.isArray(subjects) && subjects.length > 0) {
      parsedSubjects = subjects;
    } else if (typeof subjects === "string" && subjects.trim()) {
      parsedSubjects = subjects.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const newSchool: SchoolItem = {
      id,
      name: name.trim(),
      area: area?.trim() || "Tuni",
      subjects: parsedSubjects,
    };

    inMemorySchools = [newSchool, ...inMemorySchools.filter((s) => s.id !== id)];
    return NextResponse.json({ success: true, school: newSchool });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add school" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: "School ID is required" }, { status: 400 });

    inMemorySchools = inMemorySchools.filter((s) => s.id !== id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete school" }, { status: 500 });
  }
}