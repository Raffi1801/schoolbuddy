import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const schoolParam = req.nextUrl.searchParams.get("school") || "";

  if (!schoolParam.trim()) {
    return NextResponse.json({ books: [] });
  }

  try {
    const decodedSchool = decodeURIComponent(schoolParam).trim();

    // Query subjects for the selected school
    const rows = await database`
      SELECT subjects 
      FROM schools 
      WHERE name ILIKE ${decodedSchool} 
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ books: [] });
    }

    const rawSubjects = rows[0]?.subjects;
    const subjectsList: string[] = Array.isArray(rawSubjects)
      ? rawSubjects
      : typeof rawSubjects === "string"
      ? JSON.parse(rawSubjects || "[]")
      : [];

    const books = subjectsList.map((name, index) => ({
      id: `book-${index + 1}`,
      name,
    }));

    return NextResponse.json({ books });
  } catch (err: any) {
    console.error("Failed to fetch books for school:", err);
    return NextResponse.json({ books: [] }, { status: 500 });
  }
}