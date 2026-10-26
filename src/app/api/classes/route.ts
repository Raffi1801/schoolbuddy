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
    const result = await database.execute({
      sql: `
        SELECT id, name
        FROM school_classes
        WHERE school_id = ?
        ORDER BY name ASC
      `,
      args: [schoolId],
    });

    return NextResponse.json({ classes: result.rows });
  } catch {
    return NextResponse.json(
      { error: "Unable to load classes right now." },
      { status: 500 }
    );
  }
}