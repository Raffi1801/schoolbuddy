import { NextRequest, NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("schoolId");

  if (!schoolId || !/^[a-z0-9-]{1,80}$/.test(schoolId)) {
    return NextResponse.json(
      { error: "A valid school is required." },
      { status: 400 }
    );
  }

  try {
    const classes = await database`
      SELECT id, name
      FROM school_classes
      WHERE school_id = ${schoolId}
      ORDER BY name ASC
    `;

    return NextResponse.json({ classes });
  } catch (error) {
    console.error("Failed to fetch classes:", error);
    return NextResponse.json(
      { error: "Unable to load classes right now." },
      { status: 500 }
    );
  }
}