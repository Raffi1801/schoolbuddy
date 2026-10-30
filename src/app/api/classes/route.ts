import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("schoolId");

  if (!schoolId || schoolId.trim().length === 0) {
    return NextResponse.json(
      { error: "A valid school is required." },
      { status: 400 }
    );
  }

  try {
    const rows = await database`
  SELECT DISTINCT id, name 
  FROM school_classes 
  WHERE school_id = ${schoolId} OR school_name ILIKE ${'%' + schoolId + '%'}
  ORDER BY NULLIF(regexp_replace(name, '\D', '', 'g'), '')::int ASC, name ASC
`;

    return NextResponse.json({ classes: rows }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch classes:", error);
    // Return empty list instead of 500 so UI doesn't crash if table has no matching classes
    return NextResponse.json({ classes: [] });
  }
}