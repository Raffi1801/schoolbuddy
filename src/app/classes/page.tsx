"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface SchoolRecord {
  id: number;
  name: string;
  classes?: string[];
}

function ClassesListContent() {
  const searchParams = useSearchParams();
  const schoolName = searchParams.get("school") || "";

  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSchoolClasses() {
      if (!schoolName) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch("/api/schools", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load classes");
        }

        const matchedSchool = (data.schools || []).find(
          (s: SchoolRecord) =>
            s.name?.trim().toLowerCase() === schoolName.trim().toLowerCase()
        );

        const configuredClasses = Array.isArray(matchedSchool?.classes)
          ? matchedSchool.classes
          : [];

        setClasses(configuredClasses);
      } catch (err: any) {
        setError(err.message || "Unable to fetch classes");
      } finally {
        setLoading(false);
      }
    }

    loadSchoolClasses();
  }, [schoolName]);

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
          Choose your student&apos;s class to proceed with book selection for{" "}
          <span className="font-bold text-slate-900">{schoolName || "Selected School"}</span>.
        </p>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm font-semibold text-slate-400">
            Loading classes from database...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : !schoolName ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-semibold text-slate-600">No school selected.</p>
            <Link
              href="/schools"
              className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
            >
              Choose a School
            </Link>
          </div>
        ) : classes.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-bold text-slate-800">
              No classes configured for {schoolName} yet.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Add classes for this school in the Admin Panel to make them available here.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Link
                key={cls}
                href={`/books?school=${encodeURIComponent(schoolName)}&class=${encodeURIComponent(cls)}`}
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
        )}
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