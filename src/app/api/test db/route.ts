import { NextResponse } from "next/server";
import { database } from "@/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Test basic database connectivity
    const ping = await database`SELECT 1 as connected;`;

    // 2. Check current database and user
    const dbInfo = await database`SELECT current_database(), current_user;`;

    // 3. Inspect if users table exists and get its columns
    const columns = await database`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;

    // 4. Try querying users
    let users: any[] = [];
    let userQueryError = null;
    try {
      users = await database`SELECT * FROM users LIMIT 5;`;
    } catch (err: any) {
      userQueryError = err?.message || String(err);
    }

    return NextResponse.json({
      status: "ok",
      ping: ping[0],
      database: dbInfo[0],
      tableExists: columns.length > 0,
      columns: columns.map((c: any) => c.column_name),
      userCount: users.length,
      users,
      userQueryError,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "fatal_database_error",
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}