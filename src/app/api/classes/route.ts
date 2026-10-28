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
    const classes = await database`
      SELECT id, name
      FROM school_classes
      WHERE LOWER(school_id) = LOWER(${schoolId.trim()})
         OR LOWER(school_name) = LOWER(${schoolId.trim()})
      ORDER BY name ASC
    `;

    return NextResponse.json({ classes });
  } catch (error) {
    console.error("Failed to fetch classes:", error);
    // Return empty list instead of 500 so UI doesn't crash if table has no matching classes
    return NextResponse.json({ classes: [] });
  }
}