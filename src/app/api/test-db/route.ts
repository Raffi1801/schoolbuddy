import { NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Check basic ping and calculate query latency
    const ping = await database`SELECT 1 as connected;`;
    const latencyMs = Date.now() - startTime;

    // 2. Fetch current database, active user, and Postgres version
    const dbInfo = await database`
      SELECT current_database(), current_user, version();
    `;

    // 3. List all existing tables in the public schema
    const existingTables = await database`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;

    // 4. Retrieve column definitions for the users table
    const columns = await database`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;

    // 5. Query sample users safely
    let users: any[] = [];
    let userQueryError: string | null = null;
    try {
      users = await database`SELECT * FROM users ORDER BY 1 DESC LIMIT 5;`;
    } catch (err: any) {
      userQueryError = err?.message || String(err);
    }

    return NextResponse.json({
      status: "ok",
      connection: {
        latencyMs,
        database: dbInfo[0]?.current_database,
        user: dbInfo[0]?.current_user,
        postgresVersion: dbInfo[0]?.version,
      },
      schema: {
        allTablesInPublic: existingTables.map((t: any) => t.table_name),
        usersTableExists: columns.length > 0,
        detectedColumns: columns,
      },
      data: {
        userCount: users.length,
        users,
        userQueryError,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "fatal_database_error",
        error: err?.message || String(err),
        hint: err?.hint || null,
        detail: err?.detail || null,
      },
      { status: 500 }
    );
  }
}