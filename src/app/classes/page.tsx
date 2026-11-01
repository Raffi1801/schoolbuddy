"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const CLASSES = [
  "Class 1", "Class 2", "Class 3",
  "Class 4", "Class 5", "Class 6",
  "Class 7", "Class 8", "Class 9",
  "Class 10"
];

function ClassesListContent() {
  const searchParams = useSearchParams();
  const school = searchParams.get("school") || "Selected School";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">📚</span>
            School <span className="text-indigo-600">Buddy</span>
          </Link>
          <Link href="/schools" className="text-xs font-semibold text-slate-500 hover:text-indigo-600">
            ← Change School
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-10">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Step 2 of 3</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Select Class / Standard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose your student's class to proceed with book selection for <span className="font-bold text-slate-900">{school}</span>.
        </p>

        {/* 3-Column Responsive Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {CLASSES.map((cls) => (
            <Link
              key={cls}
              href={`/books?school=${encodeURIComponent(school)}&class=${encodeURIComponent(cls)}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs hover:border-indigo-500 hover:shadow-md transition"
            >
              <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition">
                {cls}
              </h3>
              <span className="mt-2 inline-block text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition">
                Select Books →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 p-12 text-center text-sm font-semibold text-slate-400">Loading classes...</div>}>
      <ClassesListContent />
    </Suspense>
  );
}