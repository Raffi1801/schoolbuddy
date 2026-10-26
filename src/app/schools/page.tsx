"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";

interface School {
  id: string;
  name: string;
  area: string;
}

const defaultSchools: School[] = [
  { id: "loyola", name: "Loyola English Medium School", area: "Tuni" },
  { id: "sri-prakash-tuni", name: "Sri Prakash Vidya Niketan", area: "Tuni Town" },
  { id: "bhashyam-tuni", name: "Bhashyam High School", area: "Main Road, Tuni" },
  { id: "st-johns-tuni", name: "Siddartha Medium High School", area: "Station Road, Tuni" },
  { id: "sri-chaitanya-tuni", name: "Sri Chaitanya School", area: "National Highway, Tuni" },
  { id: "narayana-tuni", name: "Narayana Olympiad School", area: "Payakaraopeta / Tuni" },
];

function SchoolsContent() {
  const [schools, setSchools] = useState<School[]>(defaultSchools);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSchools() {
      // 1. Check local storage first (picks up schools added in Admin)
      let cached: School[] = [];
      try {
        const stored = localStorage.getItem("sb_custom_schools");
        if (stored) {
          cached = JSON.parse(stored);
        }
      } catch {}

      try {
        const res = await fetch("/api/schools");
        if (res.ok) {
          const data = await res.json();
          const apiSchools: School[] = data.schools || [];

          // Merge cached admin schools with API schools and defaults
          const merged = [
            ...cached,
            ...apiSchools.filter((s) => !cached.some((c) => c.id === s.id)),
            ...defaultSchools.filter(
              (d) => !cached.some((c) => c.id === d.id) && !apiSchools.some((a) => a.id === d.id)
            ),
          ];

          setSchools(merged);
          return;
        }
      } catch {}

      // Fallback if network fails
      if (cached.length > 0) {
        const fallbackMerged = [
          ...cached,
          ...defaultSchools.filter((d) => !cached.some((c) => c.id === d.id)),
        ];
        setSchools(fallbackMerged);
      }
    }

    loadSchools();
  }, []);

  const filteredSchools = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.area.toLowerCase().includes(term)
    );
  }, [schools, searchTerm]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">📚</span>
            School<span className="text-indigo-600">Buddy</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-indigo-700">
            ← Back to home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-10">
        <p className="font-semibold text-xs tracking-wider uppercase text-indigo-700">Step 1 of 3</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Find your child’s school</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select a school to view its available class list.
        </p>

        <div className="mt-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Search by school name or area
          </label>
          <input
            type="text"
            placeholder="For example: Loyola, Sri Prakash, or Payakaraopeta"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm shadow-xs focus:border-indigo-600 focus:outline-none"
          />
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-medium text-slate-500">
              Loading schools...
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No matching schools found for "{searchTerm}".
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredSchools.map((s) => (
                <Link
                  key={s.id}
                  href={`/classes?school=${encodeURIComponent(s.name)}`}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-indigo-600 hover:bg-indigo-50/40 hover:shadow-sm"
                >
                  <div>
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-700">
                      {s.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">{s.area}</p>
                  </div>
                  <span className="mt-3 text-xs font-semibold text-indigo-600 group-hover:underline">
                    Select School →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function SchoolsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 p-12 text-center text-slate-600 font-medium">
          Loading schools...
        </div>
      }
    >
      <SchoolsContent />
    </Suspense>
  );
}