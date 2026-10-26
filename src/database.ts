import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "database.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    school TEXT,
    class_name TEXT,
    books TEXT DEFAULT '[]',
    cover TEXT,
    delivery TEXT,
    required_date TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    address TEXT,
    total REAL DEFAULT 0.0,
    payment_due REAL DEFAULT 0.0,
    payment_type TEXT,
    status TEXT DEFAULT 'Order Placed',
    created_at TEXT
  );
`);

export default db;

