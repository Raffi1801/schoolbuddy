"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type SchoolClass = {
  id: string;
  name: string;
};

const DEFAULT_CLASSES: SchoolClass[] = [
  { id: "class-1", name: "Class 1" },
  { id: "class-2", name: "Class 2" },
  { id: "class-3", name: "Class 3" },
  { id: "class-4", name: "Class 4" },
  { id: "class-5", name: "Class 5" },
  { id: "class-6", name: "Class 6" },
  { id: "class-7", name: "Class 7" },
  { id: "class-8", name: "Class 8" },
  { id: "class-9", name: "Class 9" },
  { id: "class-10", name: "Class 10" },
];

function ClassesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = searchParams.get("school") || "";
  const [classes, setClasses] = useState<SchoolClass[]>(DEFAULT_CLASSES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClasses() {
      if (!schoolId) {
        setClasses(DEFAULT_CLASSES);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/classes?schoolId=${encodeURIComponent(schoolId)}`);
        const data = await res.json();

        if (res.ok && Array.isArray(data.classes) && data.classes.length > 0) {
          setClasses(data.classes);
        } else {
          setClasses(DEFAULT_CLASSES);
        }
      } catch (err) {
        console.error("Failed to load classes from API, using defaults:", err);
        setClasses(DEFAULT_CLASSES);
      } finally {
        setLoading(false);
      }
    }

    loadClasses();
  }, [schoolId]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">📚</span>
            School<span className="text-indigo-600">Buddy</span>
          </Link>
          <Link href="/schools" className="text-sm font-semibold text-slate-600 hover:text-indigo-700">
            ← Change School
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-10">
        <p className="font-semibold text-xs tracking-wider uppercase text-indigo-700">Step 2 of 3</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Select Class / Standard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose your student's class to proceed with book selection.
        </p>

        {loading ? (
          <div className="mt-10 text-center text-sm font-medium text-slate-500">
            Loading classes...
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {classes.map((cls) => (
              <Link
                key={cls.id}
                href={`/books?school=${encodeURIComponent(schoolId || "Default School")}&class=${encodeURIComponent(cls.name)}`}
                className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:border-indigo-600 hover:bg-indigo-50/50 hover:shadow-md transition text-center group"
              >
                <span className="text-xl font-black text-slate-900 group-hover:text-indigo-700">
                  {cls.name}
                </span>
                <span className="mt-1 text-xs text-slate-400">Select Books →</span>
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center font-medium text-slate-600">
          Loading classes...
        </div>
      }
    >
      <ClassesContent />
    </Suspense>
  );
}