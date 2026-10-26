import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing.");
}

const database = createClient({ url: databaseUrl });

await database.batch(
  [
    `CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS school_classes (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (school_id, name),
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS class_books (
      class_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (class_id, book_id),
      FOREIGN KEY (class_id) REFERENCES school_classes(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS cover_options (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
        CHECK (name IN ('Normal', 'Premium', 'Special')),
      price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
      currency TEXT NOT NULL DEFAULT 'INR',
      image_url TEXT,
      active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
    )`,

    `CREATE TABLE IF NOT EXISTS school_registration_requests (
      id TEXT PRIMARY KEY,
      school_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      area TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,

    `INSERT OR IGNORE INTO schools (id, name, area, status) VALUES
      ('greenwood-primary', 'Greenwood Primary School', 'Central Area', 'APPROVED'),
      ('riverside-international', 'Riverside International School', 'North Area', 'APPROVED'),
      ('sunrise-academy', 'Sunrise Academy', 'West Area', 'APPROVED')`,

    `INSERT OR IGNORE INTO school_classes (id, school_id, name) VALUES
      ('greenwood-grade-1', 'greenwood-primary', 'Grade 1'),
      ('greenwood-grade-2', 'greenwood-primary', 'Grade 2')`,

    `INSERT OR IGNORE INTO books (id, title) VALUES
      ('english-workbook', 'English Workbook'),
      ('mathematics-textbook', 'Mathematics Textbook'),
      ('science-activity-book', 'Science Activity Book'),
      ('social-studies-workbook', 'Social Studies Workbook'),
      ('language-practice-book', 'Language Practice Book')`,

    `INSERT OR IGNORE INTO class_books (class_id, book_id, sort_order) VALUES
      ('greenwood-grade-1', 'english-workbook', 1),
      ('greenwood-grade-1', 'mathematics-textbook', 2),
      ('greenwood-grade-1', 'science-activity-book', 3),
      ('greenwood-grade-1', 'social-studies-workbook', 4),
      ('greenwood-grade-1', 'language-practice-book', 5)`,

    `INSERT OR IGNORE INTO cover_options (id, name, price_minor, currency) VALUES
      ('normal-cover', 'Normal', 2500, 'INR'),
      ('premium-cover', 'Premium', 4000, 'INR'),
      ('special-cover', 'Special', 6000, 'INR')`,
  ],
  "write"
);

await database.close();

console.log("SchoolBuddy database initialized safely.");