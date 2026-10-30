import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

const DEFAULT_CLASSES = [
  { id: "class-1", name: "Class 1" },
  { id: "class-2", name: "Class 2" },
  { id: "class-3", name: "Class 3" },
  { id: "class-4", name: "Class 4" },
  { id: "class-5", name: "Class 5" },
  { id: "class-6", name: "Class 6" },
  { id: "class-7", name: "Class 7" },
  { id: "class-8", name: "Class 8" },
  { id: "class-9", name: "Class 9" },
  { id: "class-10", name: "Class 10" },
];

export async function GET(req: NextRequest) {
  const schoolParam =
    req.nextUrl.searchParams.get("schoolId") ||
    req.nextUrl.searchParams.get("school") ||
    "";

  if (!schoolParam.trim()) {
    return NextResponse.json({ classes: DEFAULT_CLASSES });
  }

  try {
    const cleanParam = decodeURIComponent(schoolParam).trim();
    const searchPattern = `%${cleanParam}%`;

    const rows = await database`
      SELECT name, MIN(id) AS id
      FROM school_classes
      WHERE school_id = ${cleanParam} 
         OR school_name ILIKE ${searchPattern}
      GROUP BY name
      ORDER BY NULLIF(regexp_replace(name, '\D', '', 'g'), '')::int ASC NULLS LAST, name ASC
    `;

    if (rows && rows.length > 0) {
      return NextResponse.json({ classes: rows });
    }

    // Default for any school without custom database rows
    return NextResponse.json({ classes: DEFAULT_CLASSES });
  } catch (error) {
    console.error("Classes API error:", error);
    return NextResponse.json({ classes: DEFAULT_CLASSES });
  }
}